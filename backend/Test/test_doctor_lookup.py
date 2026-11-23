
from services.appointment_tools import find_doctors

doctors = find_doctors("Cardiology")

if doctors:
    print("Doctors found:")

    for doctor in doctors:
        print(doctor)
else:
    print("No available cardiologists found.")
