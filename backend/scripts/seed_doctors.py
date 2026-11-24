import sys
import os
from datetime import datetime, timezone
from uuid import uuid4

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database.mongodb import get_db

INITIAL_DOCTORS = [
    {
        "doctor_id": "doc-sarah-johnson",
        "name": "Dr. Sarah Johnson",
        "specialization": "General Physician",
        "qualification": "MBBS, MD - General Medicine",
        "experience": 12,
        "available": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "doctor_id": "doc-michael-brown",
        "name": "Dr. Michael Brown",
        "specialization": "Cardiology",
        "qualification": "MBBS, MD, DM - Cardiology",
        "experience": 15,
        "available": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "doctor_id": "doc-emily-davis",
        "name": "Dr. Emily Davis",
        "specialization": "Dermatology",
        "qualification": "MBBS, MD - Dermatology",
        "experience": 8,
        "available": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "doctor_id": "doc-james-wilson",
        "name": "Dr. James Wilson",
        "specialization": "Pediatrics",
        "qualification": "MBBS, MD - Pediatrics",
        "experience": 10,
        "available": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "doctor_id": "doc-lisa-ray",
        "name": "Dr. Lisa Ray",
        "specialization": "Orthopedics",
        "qualification": "MBBS, MS - Orthopedics",
        "experience": 14,
        "available": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
    {
        "doctor_id": "doc-robert-chen",
        "name": "Dr. Robert Chen",
        "specialization": "Neurology",
        "qualification": "MBBS, MD, DM - Neurology",
        "experience": 16,
        "available": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    },
]

def seed():
    db = get_db()
    if db is None:
        print("[ERROR] MongoDB not connected")
        return
    doctors_col = db["doctors"]
    for doc in INITIAL_DOCTORS:
        existing = doctors_col.find_one({"doctor_id": doc["doctor_id"]})
        if not existing:
            doctors_col.insert_one(doc)
            print(f"[SUCCESS] Inserted doctor: {doc['name']} ({doc['specialization']})")
        else:
            print(f"[INFO] Doctor {doc['name']} already exists.")

if __name__ == "__main__":
    seed()

