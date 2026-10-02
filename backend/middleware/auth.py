from typing import Optional, List
from fastapi import Request, HTTPException, status, Depends
from pydantic import BaseModel
from database.redis import get_session
from config import SESSION_COOKIE_NAME


class AuthenticatedUser(BaseModel):
    """
    Authenticated user context reconstructed from Redis session.
    Avoids unnecessary MongoDB round-trips for high-performance requests.
    """
    user_id: str
    email: str
    name: str
    role: str
    session_id: str

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"


def extract_session_id(request: Request) -> Optional[str]:
    """
    Extract session token from request.
    Supports:
    1. HttpOnly Cookie (Primary for web browsers)
    2. Authorization: Bearer <session_id> header (API clients / Swagger / curl)
    3. X-Session-ID header (alternative API header)
    """
    # 1. Cookie
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if session_id:
        return session_id

    # 2. Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):].strip()
        if token:
            return token

    # 3. X-Session-ID header
    custom_header = request.headers.get("X-Session-ID")
    if custom_header:
        return custom_header.strip()

    return None


async def get_current_user(request: Request) -> AuthenticatedUser:
    """
    FastAPI dependency to retrieve the current authenticated user from Redis session.
    Raises 401 Unauthorized if session is missing, invalid, or expired.
    """
    session_id = extract_session_id(request)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No session found."
        )

    session_data = await get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again."
        )

    return AuthenticatedUser(
        user_id=session_data.get("user_id", ""),
        email=session_data.get("email", ""),
        name=session_data.get("name", ""),
        role=session_data.get("role", "user"),
        session_id=session_id
    )


class RoleChecker:
    """
    FastAPI dependency factory for Role-Based Access Control (RBAC).
    Verifies that the authenticated user possesses one of the allowed roles.
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    async def __call__(
        self,
        current_user: AuthenticatedUser = Depends(get_current_user)
    ) -> AuthenticatedUser:
        if current_user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: Insufficient permissions. Required role: {', '.join(self.allowed_roles)}"
            )
        return current_user


# Convenient reusable dependency instances
require_authenticated_user = get_current_user
require_user = RoleChecker(["user", "admin"])
require_admin = RoleChecker(["admin"])
