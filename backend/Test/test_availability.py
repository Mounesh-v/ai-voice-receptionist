
from services.appointment_tools import check_doctor_availability

doctor_id = "a3733ec6-3237-4ad4-a53b-fbdeb3edceb9"

result = check_doctor_availability(
    doctor_id=doctor_id,
    appointment_date="2026-11-21"
)

print("Doctor ID:", result["doctor_id"])
print("Date:", result["date"])

print("\nAppointment Slots:")

for slot in result["slots"]:
    print(
        slot["start"],
        "Available" if slot["available"] else "Booked"
    )
