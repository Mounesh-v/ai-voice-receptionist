
import re

from fastapi import HTTPException
from database.mongodb import get_db
from datetime import date, datetime, time, timedelta, timezone




def find_doctors(
    specialization: str,
    doctor_name: str | None = None
) -> list[dict]:
    """
    Find available doctors by specialization.
    Optionally filter by doctor name.
    """

    db = get_db()

    if db is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB connection unavailable"
        )

    doctors_collection = db["doctors"]

    query = {
        "available": True,
        "specialization": {
            "$regex": f"^{re.escape(specialization.strip())}$",
            "$options": "i"
        }
    }

    if doctor_name:
        query["name"] = {
            "$regex": re.escape(doctor_name.strip()),
            "$options": "i"
        }

    doctors = []

    for doctor in doctors_collection.find(query):
        doctors.append({
            "doctor_id": doctor["doctor_id"],
            "name": doctor["name"],
            "specialization": doctor["specialization"],
            "qualification": doctor.get("qualification"),
            "experience": doctor.get("experience")
        })

    return doctors



def get_doctor_availability(
    doctor_id: str,
    appointment_date: date,
    timezone_offset: str = "+05:30"
) -> dict:
    """
    Get available 30-minute appointment slots
    between 09:00 and 17:00.
    """

    # Validate timezone offset
    match = re.fullmatch(
        r"([+-])(\d{2}):(\d{2})",
        timezone_offset
    )

    if not match:
        raise HTTPException(
            status_code=400,
            detail="timezone_offset must look like +05:30"
        )

    sign, hh, mm = match.groups()

    hours = int(hh)
    minutes = int(mm)

    if (
        hours > 14
        or minutes > 59
        or (hours == 14 and minutes != 0)
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid timezone offset"
        )

    # Create timezone
    offset = timedelta(hours=hours, minutes=minutes)

    if sign == "-":
        offset = -offset

    local_tz = timezone(offset)

    # Hospital working hours: 9 AM to 5 PM
    local_start = datetime.combine(
        appointment_date,
        time(9, 0),
        tzinfo=local_tz
    )

    local_end = datetime.combine(
        appointment_date,
        time(17, 0),
        tzinfo=local_tz
    )

    # Connect to MongoDB
    db = get_db()

    if db is None:
        raise HTTPException(
            status_code=503,
            detail="MongoDB connection unavailable"
        )

    slots_collection = db["booking_slots"]

    slots = []
    now = datetime.now(timezone.utc)
    cursor = local_start

    while cursor + timedelta(minutes=30) <= local_end:

        start = cursor.astimezone(timezone.utc)

        # Skip past slots
        if start > now:

            slot_id = f"{doctor_id}:{start.isoformat()}"

            reserved = slots_collection.find_one(
                {"_id": slot_id}
            )

            slots.append({
                "start": start.isoformat(),
                "available": reserved is None
            })

        cursor += timedelta(minutes=30)

    return {
        "doctor_id": doctor_id,
        "date": appointment_date.isoformat(),
        "timezone_offset": timezone_offset,
        "slots": slots
    }


def check_doctor_availability(
    doctor_id: str,
    appointment_date: str,
    timezone_offset: str = "+05:30"
) -> dict:
    """
    Wrapper for the AI appointment agent.
    """

    selected_date = date.fromisoformat(appointment_date)

    return get_doctor_availability(
        doctor_id=doctor_id,
        appointment_date=selected_date,
        timezone_offset=timezone_offset
    )



