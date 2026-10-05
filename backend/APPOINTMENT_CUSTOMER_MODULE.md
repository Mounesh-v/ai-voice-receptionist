# Appointment & Customer Management Module

This module is integrated with the existing FastAPI backend and reuses `middleware.auth` and the MongoDB connection in `database.mongodb`.

## New files
- `api/appointments.py`: appointment availability, booking, customer-specific listing, admin listing, cancellation, rescheduling, and status.
- `api/customers.py`: customer profile management and appointment history.

`main.py` registers both routers under `/api`.

## Endpoints

| Method | Endpoint | Access |
|---|---|---|
| GET | `/api/appointments/availability?doctor_id=DOC001&appointment_date=2026-10-10&timezone_offset=+05:30` | Authenticated |
| POST | `/api/appointments` | Authenticated |
| GET | `/api/appointments/my` | Authenticated; own appointments |
| GET | `/api/appointments` | Admin only; all appointments |
| GET | `/api/appointments/{appointment_id}` | Owner or admin |
| GET | `/api/appointments/{appointment_id}/status` | Owner or admin |
| PATCH | `/api/appointments/{appointment_id}/cancel` | Owner or admin |
| PATCH | `/api/appointments/{appointment_id}/reschedule` | Owner or admin |
| GET | `/api/customers/me` | Authenticated; own profile |
| PUT | `/api/customers/me` | Authenticated; update own profile |
| GET | `/api/customers/{customer_id}` | Owner or admin |
| GET | `/api/customers/{customer_id}/appointments` | Owner or admin |
| GET | `/api/customers` | Admin only |

## Booking request

```json
{
  "doctor_id": "DOC001",
  "service": "General Consultation",
  "appointment_start": "2026-10-10T09:00:00+05:30",
  "reason": "General checkup"
}
```

The current starter assumes fixed 30-minute slots between 09:00 and 17:00 in the requested timezone. Integrate the real doctor schedule, holidays, and service-specific duration before production. The slot collection uses MongoDB's unique `_id` to prevent two concurrent requests from reserving the same doctor/start-time slot.

## Customer profile update

```json
{
  "phone": "9876543210",
  "address": "Nabha",
  "date_of_birth": "2004-05-20",
  "emergency_contact": "9876500000"
}
```

Customer identity comes from the existing `users` collection and Redis session; this module does not create duplicate user accounts or accept a customer ID from the booking request.

## Run

From the `backend` directory, activate the project's virtual environment and run:

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

Open `http://127.0.0.1:8000/docs`. Log in using `/api/auth/login` first, then authorize Swagger with the returned session ID as a Bearer token if the browser cookie is not being used.

## Before production

- Add and validate doctor records/schedules and appointment duration rules.
- Use MongoDB transactions or a recoverable reservation workflow to handle failures across the slot and appointment writes.
- Add appointment event history, notification/SMS workflows, and a policy for how close to appointment time cancellation is allowed.
- Review and test authorization and concurrency against the team's deployed MongoDB/Redis services.
