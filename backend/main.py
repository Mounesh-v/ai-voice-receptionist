from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.voice import router as voice_router
from api.chat import router as chat_router
from api.tts import router as tts_router
from api.auth import router as auth_router
from api.admin import router as admin_router
from api.appointments import router as appointments_router
from api.customers import router as customers_router
from database.redis import close_redis

# For RAG API
from api.documents import router as documents_router

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
app.include_router(chat_router, prefix="/api")
app.include_router(tts_router, prefix="/api")

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

# Appointment and customer management modules
app.include_router(appointments_router, prefix="/api")
app.include_router(customers_router, prefix="/api")


#RAG module
app.include_router(
    documents_router,
    prefix="/api",
    tags=["Documents"],
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