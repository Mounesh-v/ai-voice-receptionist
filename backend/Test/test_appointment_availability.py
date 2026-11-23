from services.appointment_agent import (
    AppointmentState,
    AppointmentExtraction,
    process_doctor_availability,
    merge_extracted_details
)

state = AppointmentState(
    conversation_id="test_conversation",
    user_id="test_user",
    service="Cardiology",
    appointment_date="2026-11-22"
)

extracted = AppointmentExtraction(
    intent="book_appointment"
)

state = process_doctor_availability(state, extracted)

print("Stage:", state.stage)
print("Doctor:", state.doctor_name)
print("Doctor ID:", state.doctor_id)
print("Available slots:", len(state.available_slots))
print("Message:", extracted.clarification_needed)

extracted = AppointmentExtraction(
    intent="book_appointment",
    appointment_time="10:30"
)
state = merge_extracted_details(state, extracted)
state = process_doctor_availability(state, extracted)

print("\nAfter selecting time:")
print("Stage:", state.stage)
print("Selected time:", state.appointment_time)
print("Message:", extracted.clarification_needed)