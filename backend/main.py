from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.voice import router as voice_router
from api.auth import router as auth_router
from api.admin import router as admin_router
from database.redis import close_redis

app = FastAPI(
    title="AI Voice Receptionist for Hospitals",
    description="Backend API with Voice Receptionist, Authentication, and RBAC",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Teammate Voice router (Existing - DO NOT BREAK)
app.include_router(
    voice_router,
    prefix="/api"
)

# Authentication router (Auth, Sessions, RBAC)
app.include_router(
    auth_router,
    prefix="/api"
)

# Admin router (RBAC protected)
app.include_router(
    admin_router,
    prefix="/api"
)


@app.on_event("shutdown")
async def shutdown_event():
    await close_redis()


@app.get("/")
def home():
    return {
        "message": "AI Voice Receptionist API"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }