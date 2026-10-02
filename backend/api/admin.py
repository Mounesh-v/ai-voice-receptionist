import logging
from fastapi import APIRouter, HTTPException, status, Depends
from pymongo.errors import DuplicateKeyError

from models.user import (
    UserRegisterRequest,
    UserResponse,
    UserRole,
    format_user_response,
)
from database.mongodb import get_users_collection
from services.security import hash_password
from middleware.auth import require_admin, AuthenticatedUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["Admin (RBAC Protected)"])


@router.get(
    "/test",
    summary="RBAC verification endpoint for Admins",
    description="Accessible exclusively to authenticated users with the 'admin' role. Returns 401 if unauthenticated, 403 if role is 'user'."
)
async def admin_test(current_admin: AuthenticatedUser = Depends(require_admin)):
    return {
        "message": "Admin authorization verified successfully",
        "user": {
            "id": current_admin.user_id,
            "name": current_admin.name,
            "email": current_admin.email,
            "role": current_admin.role,
        }
    }


@router.post(
    "/create-admin",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Controlled creation of new admin accounts",
    description="Allows an authenticated admin to securely create new staff/admin accounts with role='admin'."
)
async def create_admin_account(
    payload: UserRegisterRequest,
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    users = get_users_collection()
    if users is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    existing = users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    admin_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": UserRole.ADMIN.value,
    }

    try:
        result = users.insert_one(admin_doc)
        admin_doc["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    except Exception as exc:
        logger.error(f"Error creating admin user: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create admin user"
        )

    safe_admin = format_user_response(admin_doc)
    return {
        "message": "Admin account created successfully",
        "user": safe_admin,
    }
