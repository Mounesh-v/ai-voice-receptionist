from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.voice import router as voice_router
from api.chat import router as chat_router
from api.tts import router as tts_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    voice_router,
    prefix="/api"
)
app.include_router(chat_router, prefix="/api")
app.include_router(tts_router, prefix="/api")

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