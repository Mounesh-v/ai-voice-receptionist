"""Appointment management routes integrated with the existing Redis-session auth."""

from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from bson import ObjectId
from services.appointment_tools import get_doctor_availability

from database.mongodb import get_db, get_users_collection
from middleware.auth import (
    AuthenticatedUser,
    require_authenticated_user,
    require_admin,
)


router = APIRouter(
    prefix="/appointments",
    tags=["Appointment Management"],
)

SLOT_MINUTES = 30


# ============================================================
# REQUEST MODELS
# ============================================================

class AppointmentCreate(BaseModel):
    doctor_id: str = Field(
        min_length=1,
        max_length=100
    )

    service: str = Field(
        min_length=2,
        max_length=150
    )

    appointment_start: datetime

    reason: Optional[str] = Field(
        default=None,
        max_length=1000
    )


class RescheduleRequest(BaseModel):
    new_start: datetime


# ============================================================
# DATABASE COLLECTIONS
# ============================================================

def collections():
    db = get_db()

    if db is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB connection unavailable"
        )

    return (
        db["appointments"],
        db["booking_slots"]
    )


# ============================================================
# DATE / TIME HELPERS
# ============================================================

def as_utc(value: datetime) -> datetime:
    """
    Validate appointment datetime and convert it to UTC.
    """

    # Timezone is required
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "Provide a timezone, e.g. "
                "2026-10-10T09:00:00+05:30"
            )
        )

    # Convert to UTC
    value = value.astimezone(timezone.utc)

    # Appointment must be on :00 or :30
    if (
        value.second != 0
        or value.microsecond != 0
        or value.minute not in (0, 30)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Appointments must start on a 30-minute "
                "boundary (:00 or :30)"
            )
        )

    # Appointment must be in the future
    if value <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Appointment must be in the future"
        )

    return value


def iso(value: datetime) -> str:
    """
    Convert datetime to UTC ISO format.
    """

    return value.astimezone(timezone.utc).isoformat()


def make_slot_id(
    doctor_id: str,
    start: datetime
) -> str:
    """
    Generate a unique slot ID using doctor + appointment time.
    """

    return f"{doctor_id}:{iso(start)}"


# ============================================================
# RESPONSE HELPER
# ============================================================

def public_appointment(doc: dict) -> dict:
    """
    Remove MongoDB's internal ObjectId before returning
    the document through FastAPI.
    """

    return {
        key: value
        for key, value in doc.items()
        if key != "_id"
    }


# ============================================================
# APPOINTMENT LOOKUP
# ============================================================

def find_appointment_or_404(
    appointments,
    appointment_id: str
):
    """
    Find appointment by appointment_id.
    """

    doc = appointments.find_one(
        {
            "appointment_id": appointment_id
        }
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="Appointment not found"
        )

    return doc


def get_scheduled_appointments(user_id: str):
    """
    Retrieve upcoming scheduled appointments
    belonging to a specific patient.
    """
    appointments, _ = collections()
    now = iso(
        datetime.now(timezone.utc)
    )
    docs = (
        appointments
        .find({
            "user_id": user_id,
            "status": "scheduled",
            "appointment_start": {
                "$gte": now
            }
        })
        .sort(
            "appointment_start",
            1
        )
    )
    return [
        public_appointment(doc)
        for doc in docs
    ]


# ============================================================
# AUTHORIZATION
# ============================================================

def ensure_owner_or_admin(
    doc: dict,
    current_user: AuthenticatedUser
):
    """
    Allow appointment access only to:
    - appointment owner
    - admin
    """

    if (
        current_user.role != "admin"
        and doc.get("user_id") != current_user.user_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot access another customer's "
                "appointment"
            )
        )


# ============================================================
# CHECK AVAILABLE APPOINTMENT SLOTS
# ============================================================

@router.get("/availability")
def availability(
    doctor_id: str = Query(
        min_length=1
    ),

    appointment_date: date = Query(
        description=(
            "Date in the timezone represented "
            "by timezone_offset"
        )
    ),

    timezone_offset: str = Query(
        default="+05:30",
        description=(
            "UTC offset such as +05:30"
        )
    ),

    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    ),
):
    return get_doctor_availability(
        doctor_id=doctor_id,
        appointment_date=appointment_date,
        timezone_offset=timezone_offset
    )


# ============================================================
# BOOK APPOINTMENT
# ============================================================

def create_appointment_record(
    payload: AppointmentCreate,
    user_id: str,
    customer_name: str,
    customer_email: str,
):
    """Create an appointment and reserve its time slot."""

    # 1. Validate appointment time
    start = as_utc(payload.appointment_start)

    # 2. Get MongoDB collections
    appointments, slots_collection = collections()

    # 3. Verify authenticated user exists
    users = get_users_collection()
    user_doc = (
        users.find_one(
            {"_id": ObjectId(user_id)}
        )
        if (
            users is not None
            and ObjectId.is_valid(user_id)
        )
        else None
    )

    if not user_doc:
        raise HTTPException(
            status_code=401,
            detail="Authenticated account was not found"
        )

    # 4. Generate unique doctor/time slot
    slot_key = make_slot_id(payload.doctor_id, start)

    # 5. Reserve appointment slot
    try:
        slots_collection.insert_one(
            {
                "_id": slot_key,
                "doctor_id": payload.doctor_id,
                "appointment_start": iso(start)
            }
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="This doctor is already booked at that time"
        )

    # 6. Generate appointment ID
    appointment_id = str(uuid4())

    # 7. Create appointment document
    doc = {
        "appointment_id": appointment_id,
        "user_id": user_id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "doctor_id": payload.doctor_id,
        "service": payload.service,
        "reason": payload.reason,
        "appointment_start": iso(start),
        "appointment_end": iso(
            start + timedelta(minutes=SLOT_MINUTES)
        ),
        "status": "scheduled",
        "created_at": iso(datetime.now(timezone.utc)),
        "updated_at": None,
    }

    # 8. Save appointment
    try:
        appointments.insert_one(doc)
    except Exception:
        slots_collection.delete_one({"_id": slot_key})
        raise HTTPException(
            status_code=500,
            detail="Could not save appointment; please retry"
        )

    # 9. Return appointment
    return public_appointment(doc)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED
)
def book_appointment(
    payload: AppointmentCreate,
    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    ),
):
    """
    Swagger/API endpoint.
    Uses the shared booking function.
    """
    return create_appointment_record(
        payload=payload,
        user_id=current_user.user_id,
        customer_name=current_user.name,
        customer_email=current_user.email
    )


# ============================================================
# GET CURRENT USER'S APPOINTMENTS
# ============================================================

@router.get("/my")
def my_appointments(
    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    )
):
    """
    Return all appointments belonging
    to the currently authenticated user.
    """

    appointments, _ = collections()

    docs = (
        appointments
        .find(
            {
                "user_id": current_user.user_id
            }
        )
        .sort(
            "appointment_start",
            -1
        )
    )

    return {
        "appointments": [
            public_appointment(doc)
            for doc in docs
        ]
    }


# ============================================================
# ADMIN - GET ALL APPOINTMENTS
# ============================================================

@router.get("")
def list_all_appointments(
    current_admin: AuthenticatedUser = Depends(
        require_admin
    )
):
    """
    Admin-only endpoint to retrieve
    all appointments.
    """

    appointments, _ = collections()

    docs = (
        appointments
        .find()
        .sort(
            "appointment_start",
            -1
        )
    )

    return {
        "appointments": [
            public_appointment(doc)
            for doc in docs
        ]
    }


# ============================================================
# GET SINGLE APPOINTMENT
# ============================================================

@router.get(
    "/{appointment_id}"
)
def get_appointment(
    appointment_id: str,

    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    ),
):
    """
    Get a single appointment.

    Allowed:
    - Appointment owner
    - Admin
    """

    appointments, _ = collections()

    doc = find_appointment_or_404(
        appointments,
        appointment_id
    )

    ensure_owner_or_admin(
        doc,
        current_user
    )

    return public_appointment(doc)


# ============================================================
# GET APPOINTMENT STATUS
# ============================================================

@router.get(
    "/{appointment_id}/status"
)
def appointment_status(
    appointment_id: str,

    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    ),
):
    """
    Return appointment status.
    """

    appointments, _ = collections()

    doc = find_appointment_or_404(
        appointments,
        appointment_id
    )

    ensure_owner_or_admin(
        doc,
        current_user
    )

    return {
        "appointment_id": appointment_id,
        "status": doc["status"],
        "appointment_start": doc[
            "appointment_start"
        ]
    }


# ============================================================
# CANCEL APPOINTMENT
# ============================================================

def cancel_appointment_record(
    appointment_id: str,
    user_id: str,
    role: str
):
    """Shared cancellation function for REST and voice booking."""

    appointments, slots_collection = collections()

    # 1. Find appointment
    doc = find_appointment_or_404(
        appointments,
        appointment_id
    )

    # 2. Check owner/admin authorization
    if (
        role != "admin"
        and doc.get("user_id") != user_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot cancel another customer's "
                "appointment"
            )
        )

    # 3. Only scheduled appointments can be cancelled
    if doc.get("status") != "scheduled":
        raise HTTPException(
            status_code=409,
            detail=(
                "Only scheduled appointments "
                "can be cancelled"
            )
        )

    now = iso(
        datetime.now(timezone.utc)
    )

    # 4. Update appointment
    result = appointments.update_one(
        {
            "appointment_id": appointment_id,
            "status": "scheduled"
        },
        {
            "$set": {
                "status": "cancelled",
                "updated_at": now,
                "cancelled_at": now
            }
        }
    )

    if result.modified_count != 1:
        raise HTTPException(
            status_code=409,
            detail=(
                "Appointment status changed; "
                "refresh and try again"
            )
        )

    # 5. Release appointment slot
    old_start = datetime.fromisoformat(
        doc["appointment_start"]
    )

    slots_collection.delete_one(
        {
            "_id": make_slot_id(
                doc["doctor_id"],
                old_start
            )
        }
    )

    return {
        "message": "Appointment cancelled",
        "appointment_id": appointment_id,
        "status": "cancelled"
    }


@router.patch(
    "/{appointment_id}/cancel"
)
def cancel_appointment(
    appointment_id: str,

    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    ),
):
    """
    Cancel a scheduled appointment.
    """
    return cancel_appointment_record(
        appointment_id=appointment_id,
        user_id=current_user.user_id,
        role=current_user.role
    )


# ============================================================
# RESCHEDULE APPOINTMENT
# ============================================================

def reschedule_appointment_record(
    appointment_id: str,
    new_start: datetime,
    user_id: str,
    role: str
):
    """
    Shared rescheduling function for REST API and voice agent.
    """

    # 1. Validate new appointment time
    new_start = as_utc(new_start)

    # 2. Get MongoDB collections
    appointments, slots_collection = collections()

    # 3. Find existing appointment
    doc = find_appointment_or_404(
        appointments,
        appointment_id
    )

    # 4. Check owner/admin authorization
    if (
        role != "admin"
        and doc.get("user_id") != user_id
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You cannot reschedule another customer's "
                "appointment"
            )
        )

    # 5. Only scheduled appointments can be rescheduled
    if doc.get("status") != "scheduled":
        raise HTTPException(
            status_code=409,
            detail=(
                "Only scheduled appointments "
                "can be rescheduled"
            )
        )

    # 6. Get the old appointment time
    old_start = datetime.fromisoformat(
        doc["appointment_start"]
    ).astimezone(timezone.utc)

    # 7. Prevent rescheduling to the same time
    if new_start == old_start:
        raise HTTPException(
            status_code=400,
            detail="Choose a different appointment time"
        )

    # 8. Generate old and new slot keys
    new_key = make_slot_id(
        doc["doctor_id"],
        new_start
    )
    old_key = make_slot_id(
        doc["doctor_id"],
        old_start
    )

    # 9. Reserve the new slot
    try:
        slots_collection.insert_one(
            {
                "_id": new_key,
                "doctor_id": doc["doctor_id"],
                "appointment_start": iso(new_start)
            }
        )
    except DuplicateKeyError:
        raise HTTPException(
            status_code=409,
            detail="The requested time is already booked"
        )

    # 10. Update the appointment
    now = iso(datetime.now(timezone.utc))
    result = appointments.update_one(
        {
            "appointment_id": appointment_id,
            "status": "scheduled",
            "appointment_start": doc["appointment_start"]
        },
        {
            "$set": {
                "appointment_start": iso(new_start),
                "appointment_end": iso(
                    new_start + timedelta(minutes=SLOT_MINUTES)
                ),
                "updated_at": now
            }
        }
    )

    # 11. Release the new slot if the update failed
    if result.modified_count != 1:
        slots_collection.delete_one({"_id": new_key})
        raise HTTPException(
            status_code=409,
            detail="Appointment changed; refresh and try again"
        )

    # 12. Release the old slot
    slots_collection.delete_one({"_id": old_key})

    # 13. Return the rescheduled appointment
    return {
        "message": "Appointment rescheduled",
        "appointment_id": appointment_id,
        "appointment_start": iso(new_start),
        "status": "scheduled"
    }


@router.patch(
    "/{appointment_id}/reschedule"
)
def reschedule_appointment(
    appointment_id: str,
    payload: RescheduleRequest,
    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    ),
):
    """
    Reschedule an existing appointment.
    """

    return reschedule_appointment_record(
        appointment_id=appointment_id,
        new_start=payload.new_start,
        user_id=current_user.user_id,
        role=current_user.role
    )