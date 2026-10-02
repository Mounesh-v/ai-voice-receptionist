from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class UserRegisterRequest(BaseModel):
    """
    Public registration schema.
    Notice: 'role' is intentionally omitted here to prevent clients from assigning
    themselves the 'admin' role during registration.
    """
    name: str = Field(..., min_length=2, max_length=100, description="Full name of user")
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=6, max_length=128, description="User password (min 6 chars)")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters long after trimming whitespace")
        return cleaned

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v.strip()) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class UserLoginRequest(BaseModel):
    """
    Login request schema.
    """
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    """
    Safe public user representation.
    Never exposes passwords or password hashes.
    """
    id: str
    name: str
    email: str
    role: str


class UserRegisterResponse(BaseModel):
    message: str
    user: UserResponse


class UserInDB(BaseModel):
    """
    Internal representation of user stored in MongoDB.
    """
    id: Optional[str] = None
    name: str
    email: str
    password_hash: str
    role: UserRole = UserRole.USER


def format_user_response(user_doc: dict) -> dict:
    """
    Safely convert a MongoDB document into a user response dictionary,
    converting ObjectId to string and strictly omitting any password hash.
    """
    return {
        "id": str(user_doc["_id"]),
        "name": user_doc.get("name", ""),
        "email": user_doc.get("email", ""),
        "role": user_doc.get("role", UserRole.USER.value),
    }
