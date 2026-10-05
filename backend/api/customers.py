"""Customer profile and appointment history routes."""
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from bson import ObjectId

from database.mongodb import get_db, get_users_collection
from middleware.auth import AuthenticatedUser, require_authenticated_user, require_admin

router = APIRouter(prefix="/customers", tags=["Customer Management"])


class CustomerProfileUpdate(BaseModel):
    phone: Optional[str] = Field(default=None, min_length=7, max_length=20)
    address: Optional[str] = Field(default=None, max_length=300)
    date_of_birth: Optional[str] = Field(default=None, description="YYYY-MM-DD")
    emergency_contact: Optional[str] = Field(default=None, max_length=100)


def db_or_503():
    db = get_db()
    if db is None:
        raise HTTPException(status_code=503, detail="MongoDB connection unavailable")
    return db


def customer_public(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


@router.get("/me")
def get_my_customer_profile(current_user: AuthenticatedUser = Depends(require_authenticated_user)):
    db = db_or_503()
    users = get_users_collection()
    user_doc = users.find_one({"_id": ObjectId(current_user.user_id)}) if users is not None and ObjectId.is_valid(current_user.user_id) else None
    if not user_doc:
        raise HTTPException(status_code=404, detail="User account not found")
    profile = db["customer_profiles"].find_one({"user_id": current_user.user_id}) or {}
    profile.pop("_id", None)
    return {
        "user_id": current_user.user_id,
        "name": user_doc.get("name", current_user.name),
        "email": user_doc.get("email", current_user.email),
        "role": current_user.role,
        "phone": profile.get("phone"),
        "address": profile.get("address"),
        "date_of_birth": profile.get("date_of_birth"),
        "emergency_contact": profile.get("emergency_contact"),
    }


@router.put("/me")
def update_my_customer_profile(
    payload: CustomerProfileUpdate,
    current_user: AuthenticatedUser = Depends(require_authenticated_user),
):
    db = db_or_503()
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail="Provide at least one profile field")
    if "date_of_birth" in changes and changes["date_of_birth"]:
        try:
            datetime.strptime(changes["date_of_birth"], "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="date_of_birth must use YYYY-MM-DD")
    changes["updated_at"] = datetime.now(timezone.utc).isoformat()
    db["customer_profiles"].update_one(
        {"user_id": current_user.user_id},
        {"$set": {**changes, "user_id": current_user.user_id}, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return get_my_customer_profile(current_user)


@router.get("/{customer_id}")
def get_customer_profile(
    customer_id: str,
    current_user: AuthenticatedUser = Depends(require_authenticated_user),
):
    if current_user.role != "admin" and current_user.user_id != customer_id:
        raise HTTPException(status_code=403, detail="You cannot access another customer's profile")
    db = db_or_503()
    users = get_users_collection()
    if not ObjectId.is_valid(customer_id) or users is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    user_doc = users.find_one({"_id": ObjectId(customer_id)})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Customer not found")
    profile = db["customer_profiles"].find_one({"user_id": customer_id}) or {}
    profile.pop("_id", None)
    return {
        "user_id": customer_id,
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "role": user_doc.get("role", "user"),
        "phone": profile.get("phone"),
        "address": profile.get("address"),
        "date_of_birth": profile.get("date_of_birth"),
        "emergency_contact": profile.get("emergency_contact"),
    }


@router.get("/{customer_id}/appointments")
def customer_appointment_history(
    customer_id: str,
    current_user: AuthenticatedUser = Depends(require_authenticated_user),
):
    if current_user.role != "admin" and current_user.user_id != customer_id:
        raise HTTPException(status_code=403, detail="You cannot access another customer's appointment history")
    db = db_or_503()
    docs = db["appointments"].find({"user_id": customer_id}).sort("appointment_start", -1)
    result = []
    for doc in docs:
        doc.pop("_id", None)
        result.append(doc)
    return {"customer_id": customer_id, "appointments": result}


@router.get("")
def list_customers(current_admin: AuthenticatedUser = Depends(require_admin)):
    db = db_or_503()
    users = get_users_collection()
    if users is None:
        raise HTTPException(status_code=503, detail="MongoDB connection unavailable")
    result = []
    for user_doc in users.find({"role": "user"}, {"password_hash": 0}):
        user_id = str(user_doc["_id"])
        profile = db["customer_profiles"].find_one({"user_id": user_id}) or {}
        result.append({
            "user_id": user_id,
            "name": user_doc.get("name", ""),
            "email": user_doc.get("email", ""),
            "phone": profile.get("phone"),
            "address": profile.get("address"),
        })
    return {"customers": result}
