"""Appointment management routes integrated with the existing Redis-session auth."""

from datetime import date, datetime, time, timedelta, timezone
from uuid import uuid4
from typing import Optional
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from bson import ObjectId

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
    """
    Return available 30-minute slots
    between 09:00 and 17:00.
    """

    # Validate timezone offset
    match = re.fullmatch(
        r"([+-])(\d{2}):(\d{2})",
        timezone_offset
    )

    if not match:
        raise HTTPException(
            status_code=400,
            detail=(
                "timezone_offset must look like +05:30"
            )
        )

    sign, hh, mm = match.groups()

    hours = int(hh)
    minutes = int(mm)

    if (
        hours > 14
        or minutes > 59
        or (
            hours == 14
            and minutes != 0
        )
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid timezone offset"
        )

    # Create timezone
    offset = timedelta(
        hours=hours,
        minutes=minutes
    )

    if sign == "-":
        offset = -offset

    local_tz = timezone(offset)

    # Hospital working hours
    local_start = datetime.combine(
        appointment_date,
        time(9, 0),
        tzinfo=local_tz
    )

    local_end = datetime.combine(
        appointment_date,
        time(17, 0),
        tzinfo=local_tz
    )

    appointments, slots_collection = collections()

    slots = []

    now = datetime.now(timezone.utc)

    cursor = local_start

    while (
        cursor + timedelta(minutes=SLOT_MINUTES)
        <= local_end
    ):
        start = cursor.astimezone(
            timezone.utc
        )

        # Don't show past slots
        if start > now:

            reserved = slots_collection.find_one(
                {
                    "_id": make_slot_id(
                        doctor_id,
                        start
                    )
                }
            )

            slots.append(
                {
                    "start": iso(start),
                    "available": reserved is None
                }
            )

        cursor += timedelta(
            minutes=SLOT_MINUTES
        )

    return {
        "doctor_id": doctor_id,
        "date": appointment_date.isoformat(),
        "timezone_offset": timezone_offset,
        "slots": slots
    }


# ============================================================
# BOOK APPOINTMENT
# ============================================================

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
    Book an appointment for the currently
    authenticated customer.
    """

    # --------------------------------------------------------
    # 1. Validate appointment time
    # --------------------------------------------------------

    start = as_utc(
        payload.appointment_start
    )

    # --------------------------------------------------------
    # 2. Get MongoDB collections
    # --------------------------------------------------------

    appointments, slots_collection = collections()

    # --------------------------------------------------------
    # 3. Verify authenticated user exists
    # --------------------------------------------------------

    users = get_users_collection()

    user_doc = (
        users.find_one(
            {
                "_id": ObjectId(
                    current_user.user_id
                )
            }
        )
        if (
            users is not None
            and ObjectId.is_valid(
                current_user.user_id
            )
        )
        else None
    )

    if not user_doc:
        raise HTTPException(
            status_code=401,
            detail="Authenticated account was not found"
        )

    # --------------------------------------------------------
    # 4. Generate unique doctor/time slot
    # --------------------------------------------------------

    slot_key = make_slot_id(
        payload.doctor_id,
        start
    )

    # --------------------------------------------------------
    # 5. Reserve appointment slot
    # --------------------------------------------------------

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
            detail=(
                "This doctor is already booked "
                "at that time"
            )
        )

    # --------------------------------------------------------
    # 6. Generate appointment ID
    # --------------------------------------------------------

    appointment_id = str(
        uuid4()
    )

    # --------------------------------------------------------
    # 7. Create appointment document
    # --------------------------------------------------------

    doc = {
        "appointment_id": appointment_id,

        "user_id": current_user.user_id,

        "customer_name": current_user.name,

        "customer_email": current_user.email,

        "doctor_id": payload.doctor_id,

        "service": payload.service,

        "reason": payload.reason,

        "appointment_start": iso(start),

        "appointment_end": iso(
            start + timedelta(
                minutes=SLOT_MINUTES
            )
        ),

        "status": "scheduled",

        "created_at": iso(
            datetime.now(timezone.utc)
        ),

        "updated_at": None,
    }

    # --------------------------------------------------------
    # 8. Save appointment
    # --------------------------------------------------------

    try:

        appointments.insert_one(doc)

    except Exception:

        # Appointment insertion failed,
        # so release the reserved slot.

        slots_collection.delete_one(
            {
                "_id": slot_key
            }
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Could not save appointment; "
                "please retry"
            )
        )

    # --------------------------------------------------------
    # 9. Return appointment without MongoDB ObjectId
    # --------------------------------------------------------

    return public_appointment(doc)


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

    appointments, slots_collection = collections()

    # Find appointment
    doc = find_appointment_or_404(
        appointments,
        appointment_id
    )

    # Check owner/admin
    ensure_owner_or_admin(
        doc,
        current_user
    )

    # Only scheduled appointments
    # can be cancelled
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

    # Update appointment
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

    # Release appointment slot
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


# ============================================================
# RESCHEDULE APPOINTMENT
# ============================================================

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

    # --------------------------------------------------------
    # 1. Validate new appointment time
    # --------------------------------------------------------

    new_start = as_utc(
        payload.new_start
    )

    # --------------------------------------------------------
    # 2. Get collections
    # --------------------------------------------------------

    appointments, slots_collection = collections()

    # --------------------------------------------------------
    # 3. Find appointment
    # --------------------------------------------------------

    doc = find_appointment_or_404(
        appointments,
        appointment_id
    )

    # --------------------------------------------------------
    # 4. Check owner/admin
    # --------------------------------------------------------

    ensure_owner_or_admin(
        doc,
        current_user
    )

    # --------------------------------------------------------
    # 5. Appointment must be scheduled
    # --------------------------------------------------------

    if doc.get("status") != "scheduled":

        raise HTTPException(
            status_code=409,
            detail=(
                "Only scheduled appointments "
                "can be rescheduled"
            )
        )

    # --------------------------------------------------------
    # 6. Get old appointment time
    # --------------------------------------------------------

    old_start = datetime.fromisoformat(
        doc["appointment_start"]
    ).astimezone(
        timezone.utc
    )

    # --------------------------------------------------------
    # 7. Prevent same time
    # --------------------------------------------------------

    if new_start == old_start:

        raise HTTPException(
            status_code=400,
            detail=(
                "Choose a different appointment time"
            )
        )

    # --------------------------------------------------------
    # 8. Generate slot keys
    # --------------------------------------------------------

    new_key = make_slot_id(
        doc["doctor_id"],
        new_start
    )

    old_key = make_slot_id(
        doc["doctor_id"],
        old_start
    )

    # --------------------------------------------------------
    # 9. Reserve new slot
    # --------------------------------------------------------

    try:

        slots_collection.insert_one(
            {
                "_id": new_key,
                "doctor_id": doc["doctor_id"],
                "appointment_start": iso(
                    new_start
                )
            }
        )

    except DuplicateKeyError:

        raise HTTPException(
            status_code=409,
            detail=(
                "The requested time "
                "is already booked"
            )
        )

    # --------------------------------------------------------
    # 10. Update appointment
    # --------------------------------------------------------

    now = iso(
        datetime.now(timezone.utc)
    )

    result = appointments.update_one(
        {
            "appointment_id": appointment_id,
            "status": "scheduled",
            "appointment_start": doc[
                "appointment_start"
            ]
        },
        {
            "$set": {
                "appointment_start": iso(
                    new_start
                ),

                "appointment_end": iso(
                    new_start
                    + timedelta(
                        minutes=SLOT_MINUTES
                    )
                ),

                "updated_at": now
            }
        }
    )

    # --------------------------------------------------------
    # 11. If update failed, release new slot
    # --------------------------------------------------------

    if result.modified_count != 1:

        slots_collection.delete_one(
            {
                "_id": new_key
            }
        )

        raise HTTPException(
            status_code=409,
            detail=(
                "Appointment changed; "
                "refresh and try again"
            )
        )

    # --------------------------------------------------------
    # 12. Release old slot
    # --------------------------------------------------------

    slots_collection.delete_one(
        {
            "_id": old_key
        }
    )

    # --------------------------------------------------------
    # 13. Return response
    # --------------------------------------------------------

    return {
        "message": "Appointment rescheduled",
        "appointment_id": appointment_id,
        "appointment_start": iso(
            new_start
        ),
        "status": "scheduled"
    }