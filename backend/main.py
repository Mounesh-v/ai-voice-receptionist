from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(
    title="AI Voice Receptionist API",
    version="1.0.0"
)


class PatientQuery(BaseModel):
    message: str


@app.get("/")
def home():
    return {
        "message": "AI Voice Receptionist API is running"
    }


@app.get("/hospital-info")
def hospital_info():
    return {
        "name": "Sample Hospital",
        "location": "Bangalore",
        "working_hours": "24/7",
        "services": [
            "Emergency",
            "General Medicine",
            "Cardiology",
            "Diagnostics"
        ]
    }


@app.post("/ask")
def ask_receptionist(query: PatientQuery):
    message = query.message.lower()

    if "location" in message:
        response = "The hospital is located in Bangalore."

    elif "timing" in message or "hours" in message:
        response = "The hospital is open 24 hours."

    elif "appointment" in message:
        response = "I can help you with appointment scheduling."

    else:
        response = (
            "I am unable to find that information. "
            "I will connect you with hospital staff."
        )

    return {
        "user_message": query.message,
        "response": response
    }