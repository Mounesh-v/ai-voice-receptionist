import logging
from fastapi import APIRouter, HTTPException, Response, Request, status, Depends
from pymongo.errors import DuplicateKeyError

from models.user import (
    UserRegisterRequest,
    UserLoginRequest,
    UserRegisterResponse,
    UserResponse,
    UserRole,
    format_user_response,
)
from database.mongodb import get_users_collection
from database.redis import create_session, delete_session
from services.security import hash_password, verify_password, generate_session_id
from middleware.auth import get_current_user, extract_session_id, AuthenticatedUser
from config import (
    SESSION_COOKIE_NAME,
    SESSION_TTL,
    SESSION_COOKIE_SECURE,
    SESSION_COOKIE_SAMESITE,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserRegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a standard hospital user/patient. Role is strictly assigned as 'user'."
)
async def register(payload: UserRegisterRequest):
    users = get_users_collection()
    if users is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    # Check if email is already registered
    existing_user = users.find_one({"email": payload.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )

    # Hash the password with bcrypt (never store plaintext)
    hashed_pwd = hash_password(payload.password)

    # Security rule: Public registration MUST ALWAYS set role="user"
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hashed_pwd,
        "role": UserRole.USER.value,
    }

    try:
        result = users.insert_one(user_doc)
        user_doc["_id"] = result.inserted_id
    except DuplicateKeyError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists"
        )
    except Exception as exc:
        logger.error(f"Error registering user: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

    safe_user = format_user_response(user_doc)
    return {
        "message": "User registered successfully",
        "user": safe_user,
    }


@router.post(
    "/login",
    summary="Log in user or admin",
    description="Authenticates credentials, generates cryptographically secure session ID, stores in Redis, and sets HttpOnly cookie."
)
async def login(payload: UserLoginRequest, response: Response):
    users = get_users_collection()
    if users is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection unavailable"
        )

    # Lookup user by email
    user = users.find_one({"email": payload.email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify bcrypt password hash
    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    user_id = str(user["_id"])
    role = user.get("role", UserRole.USER.value)
    name = user.get("name", "")
    email = user.get("email", "")

    # Generate cryptographically secure session ID
    session_id = generate_session_id()

    # Store session in Redis
    try:
        await create_session(
            session_id=session_id,
            user_id=user_id,
            role=role,
            email=email,
            name=name,
            ttl=SESSION_TTL,
        )
    except Exception as exc:
        logger.error(f"Failed to store session in Redis: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session creation failed"
        )

    # Set HttpOnly cookie for browser security (protects against XSS)
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=session_id,
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
        max_age=SESSION_TTL,
        path="/",
    )

    safe_user = format_user_response(user)
    return {
        "message": "Login successful",
        "session_id": session_id,
        "user": safe_user,
    }


@router.post(
    "/logout",
    summary="Log out current session",
    description="Invalidates and deletes the session from Redis and clears the session cookie."
)
async def logout(request: Request, response: Response):
    session_id = extract_session_id(request)
    if session_id:
        try:
            await delete_session(session_id)
        except Exception as exc:
            logger.warning(f"Error deleting Redis session on logout: {exc}")

    # Clear session cookie
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        secure=SESSION_COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
    )

    return {"message": "Logged out successfully"}


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
    description="Returns the profile of the currently logged-in user or admin from the validated session."
)
async def get_me(current_user: AuthenticatedUser = Depends(get_current_user)):
    return {
        "id": current_user.user_id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
    }
