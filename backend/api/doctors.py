
from datetime import datetime, timezone
from uuid import uuid4
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database.mongodb import get_db
from middleware.auth import (
    AuthenticatedUser,
    require_authenticated_user,
    require_admin
)

router = APIRouter(
    prefix="/doctors",
    tags=["Doctor Management"]
)


# Request model
class DoctorCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    specialization: str = Field(min_length=2, max_length=100)
    qualification: Optional[str] = None
    experience: Optional[int] = Field(default=None, ge=0)
    available: bool = True


# Database helper
def get_doctors_collection():
    db = get_db()

    if db is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB connection unavailable"
        )

    return db["doctors"]


# Add doctor - Admin only
@router.post("", status_code=201)
def create_doctor(
    payload: DoctorCreate,
    admin: AuthenticatedUser = Depends(require_admin)
):
    doctors = get_doctors_collection()

    doctor = payload.model_dump()

    doctor["doctor_id"] = str(uuid4())
    doctor["created_at"] = datetime.now(
        timezone.utc
    ).isoformat()

    doctors.insert_one(doctor)

    doctor.pop("_id", None)

    return {
        "message": "Doctor added successfully",
        "doctor": doctor
    }


# Get all doctors
@router.get("")
def list_doctors(
    specialization: Optional[str] = None,
    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    )
):
    doctors = get_doctors_collection()

    query = {"available": True}

    if specialization:
        query["specialization"] = {
            "$regex": f"^{specialization}$",
            "$options": "i"
        }

    result = []

    for doctor in doctors.find(query):
        doctor.pop("_id", None)
        result.append(doctor)

    return {"doctors": result}


# Get doctor by ID
@router.get("/{doctor_id}")
def get_doctor(
    doctor_id: str,
    current_user: AuthenticatedUser = Depends(
        require_authenticated_user
    )
):
    doctors = get_doctors_collection()

    doctor = doctors.find_one({
        "doctor_id": doctor_id,
        "available": True
    })

    if not doctor:
        raise HTTPException(
            status_code=404,
            detail="Doctor not found"
        )

    doctor.pop("_id", None)

    return {"doctor": doctor}
