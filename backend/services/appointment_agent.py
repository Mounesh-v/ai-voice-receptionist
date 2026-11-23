
import json
import logging
import re
from datetime import datetime
from typing import Optional, Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, Field
from langchain_groq import ChatGroq

from fastapi import HTTPException
from api.appointments import (
    AppointmentCreate,
    create_appointment_record,
    get_scheduled_appointments,
    cancel_appointment_record,
    reschedule_appointment_record
)

from config import GROQ_API_KEY, GROQ_MODEL
from database.redis import get_redis_client

from datetime import datetime, time
from services.appointment_tools import (
    find_doctors,
    check_doctor_availability
)

logger = logging.getLogger(__name__)

# India timezone for interpreting expressions like "tomorrow".
INDIA_TZ = ZoneInfo("Asia/Kolkata")

# Keep incomplete booking conversations for 20 minutes.
APPOINTMENT_STATE_TTL = 1200


# ============================================================
# 1. APPOINTMENT CONVERSATION STATE
# ============================================================

class AppointmentState(BaseModel):
    conversation_id: str
    user_id: str

    intent: str = "unknown"

    service: Optional[str] = None
    doctor_name: Optional[str] = None
    doctor_id: Optional[str] = None
    doctor_options: list[dict] = Field(default_factory=list)
    available_slots: list[str] = Field(default_factory=list)

    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    appointment_id: Optional[str] = None

    # Cancellation details
    cancellation_options: list[dict] = Field(default_factory=list)
    selected_cancellation_id: Optional[str] = None

    # Rescheduling details
    rescheduling_options: list[dict] = Field(default_factory=list)
    selected_reschedule_id: Optional[str] = None

    reason: Optional[str] = None
    confirmation: Optional[bool] = None

    stage: Literal[
        "collecting_details",
        "ready_for_availability",
        "awaiting_doctor_selection",
        "awaiting_time_selection",
        "awaiting_confirmation",
        "awaiting_appointment_selection",
        "awaiting_cancel_confirmation",
        "awaiting_reschedule_selection",
        "awaiting_reschedule_date",
        "awaiting_reschedule_time_selection",
        "awaiting_reschedule_confirmation",
        "rescheduling",
        "rescheduled",
        "booking",
        "booked",
        "cancelled",
        "failed"
    ] = "collecting_details"

    awaiting_confirmation: bool = False

    updated_at: Optional[str] = None


# ============================================================
# 2. REDIS STATE MANAGEMENT
# ============================================================

def _state_key(conversation_id: str) -> str:
    """
    Create a Redis key for one appointment conversation.
    """

    # Only accept safe IDs such as UUIDs.
    if not re.fullmatch(
        r"[a-zA-Z0-9_-]{1,100}",
        conversation_id
    ):
        raise ValueError("Invalid conversation ID")

    return f"appointment_state:{conversation_id}"


async def create_appointment_state(
    conversation_id: str,
    user_id: str
) -> AppointmentState:
    """
    Create a fresh appointment conversation.
    """

    state = AppointmentState(
        conversation_id=conversation_id,
        user_id=user_id,
        updated_at=datetime.now(INDIA_TZ).isoformat()
    )

    await save_appointment_state(state)

    return state


async def save_appointment_state(
    state: AppointmentState
) -> None:
    """
    Save appointment state in Redis with expiration.
    """

    client = await get_redis_client()

    state.updated_at = datetime.now(
        INDIA_TZ
    ).isoformat()

    await client.set(
        _state_key(state.conversation_id),
        state.model_dump_json(),
        ex=APPOINTMENT_STATE_TTL
    )


async def get_appointment_state(
    conversation_id: str
) -> Optional[AppointmentState]:
    """
    Load an existing appointment conversation.
    """

    client = await get_redis_client()

    raw_state = await client.get(
        _state_key(conversation_id)
    )

    if not raw_state:
        return None

    try:
        return AppointmentState.model_validate_json(
            raw_state
        )

    except Exception:
        logger.exception(
            "Could not decode appointment state"
        )
        return None


async def delete_appointment_state(
    conversation_id: str
) -> None:
    """
    Delete appointment conversation state.
    """

    client = await get_redis_client()

    await client.delete(
        _state_key(conversation_id)
    )


# ============================================================
# 3. UPDATE CONVERSATION STATE
# ============================================================

def merge_extracted_details(
    state: AppointmentState,
    extracted: "AppointmentExtraction"
) -> AppointmentState:
    """
    Merge new AI-extracted information into existing state.

    Missing values do not overwrite previously collected values.
    """

    state.intent = extracted.intent

    if extracted.service:
        state.service = extracted.service

    if extracted.doctor_name:
        state.doctor_name = extracted.doctor_name

    if extracted.appointment_date:
        state.appointment_date = (
            extracted.appointment_date
        )

    if extracted.appointment_time:
        state.appointment_time = (
            extracted.appointment_time
        )

    if extracted.reason:
        state.reason = extracted.reason

    if extracted.confirmation is not None:
        state.confirmation = extracted.confirmation

    return state


def get_missing_details(
    state: AppointmentState
) -> list[str]:
    """
    Identify information needed before checking availability.

    Doctor selection is not mandatory here because the next
    stage can search for a suitable available doctor.
    """

    missing = []

    if not state.service:
        missing.append("service")

    if not state.appointment_date:
        missing.append("appointment_date")

    return missing


# ============================================================
# 4. STRUCTURED APPOINTMENT EXTRACTION MODEL
# ============================================================

class AppointmentExtraction(BaseModel):
    """
    Structured information extracted from the patient's speech.
    """

    intent: Literal[
        "general_question",
        "book_appointment",
        "provide_details",
        "confirm_booking",
        "cancel_booking",
        "reschedule_booking"
    ] = Field(
        description="The patient's current intent."
    )

    service: Optional[str] = Field(
        default=None,
        description="Hospital department or requested service."
    )

    doctor_name: Optional[str] = Field(
        default=None,
        description="Doctor name if explicitly mentioned."
    )

    appointment_date: Optional[str] = Field(
        default=None,
        description="Date in YYYY-MM-DD format. Null if unclear."
    )

    appointment_time: Optional[str] = Field(
        default=None,
        description="Time in 24-hour HH:MM format. Null if unclear."
    )

    reason: Optional[str] = Field(
        default=None,
        description="Reason for consultation, if provided."
    )

    confirmation: Optional[bool] = Field(
        default=None,
        description=(
            "True for explicit confirmation, false for explicit "
            "rejection, otherwise null."
        )
    )

    appointment_selection: Optional[int] = Field(
        default=None,
        description=(
            "The 1-based number of the appointment selected "
            "by the patient, if they explicitly select one."
        )
    )

    clarification_needed: Optional[str] = Field(
        default=None,
        description=(
            "A short clarification question if the request "
            "contains an ambiguous date, time, or detail."
        )
    )


# ============================================================
# 5. GROQ STRUCTURED OUTPUT
# ============================================================

llm = ChatGroq(
    model=GROQ_MODEL,
    api_key=GROQ_API_KEY,
    temperature=0,
    max_retries=2,
)

# Use Groq tool/function calling to produce a Pydantic object.
structured_llm = llm.with_structured_output(
    AppointmentExtraction,
    method="function_calling"
)


EXTRACTION_SYSTEM_PROMPT = """
You are an information extraction assistant for a hospital
appointment receptionist.

Your task is to understand the patient's latest message and
extract appointment information into the requested fields.

IMPORTANT RULES:

1. Extract only information supported by the patient's message
   or the existing conversation state.

2. Never invent a doctor, department, date, time, or reason.

3. Preserve information already present in the conversation.

4. If the patient says "tomorrow", "today", or "next Monday",
   calculate the date using the supplied current date.

5. Return appointment_date in YYYY-MM-DD format.

6. Return appointment_time in 24-hour HH:MM format.

7. If a date or time is ambiguous, leave that field null and
   provide a clarification question.

8. If the patient says "yes" or "confirm", classify it as
   confirm_booking only when the conversation is explicitly
   awaiting booking confirmation.

9. If the patient says "no" while awaiting confirmation,
   classify it as confirm_booking with confirmation=false.

10. Do not treat a general question about appointments as a
    booking request.

11. A department can be extracted as service. Examples:
    Cardiology, General Medicine, Dermatology.

12. Do not create a doctor name from a department name.

13. If the patient corrects a previously supplied detail,
    return the corrected value.

14. Keep the output concise and follow the schema exactly.

15. If the patient requests appointment cancellation,
    classify the intent as cancel_booking.

16. If the system is awaiting appointment selection,
    extract the selected appointment number as a 1-based integer.

17. If the system is awaiting cancellation confirmation,
    classify an explicit "yes" as confirmation=true
    and an explicit "no" as confirmation=false.

18. Never interpret a yes/no response as cancellation
    confirmation unless the system is awaiting cancellation
    confirmation.

19. If the patient requests to reschedule an appointment,
    classify the intent as reschedule_booking.

20. If the system is awaiting reschedule appointment selection,
    extract the selected appointment number as a 1-based integer.

21. If the system is awaiting reschedule confirmation,
    classify an explicit "yes" as confirmation=true
    and an explicit "no" as confirmation=false.

22. Never interpret a yes/no response as rescheduling
    confirmation unless the system is awaiting reschedule
    confirmation.

23. If the system is awaiting a new reschedule date,
    extract the requested date in YYYY-MM-DD format.

24. If the system is awaiting a new reschedule time,
    extract the requested time in 24-hour HH:MM format.

25. Do not treat a date or time response during rescheduling
    as a new appointment booking request.

26. When awaiting reschedule time selection, extract the
    selected time in 24-hour HH:MM format. Convert spoken
    times such as 10:30 AM into 10:30.
"""


# ============================================================
# 6. EXTRACT INFORMATION FROM PATIENT'S MESSAGE
# ============================================================

async def extract_appointment_intent(
    transcript: str,
    state: AppointmentState
) -> AppointmentExtraction:
    """
    Convert the latest patient transcript into structured data.
    """

    current_date = datetime.now(
        INDIA_TZ
    ).date().isoformat()

    existing_state = state.model_dump(
        exclude={
            "conversation_id",
            "user_id",
            "updated_at"
        }
    )

    user_prompt = f"""
Current date in India: {current_date}

Existing appointment conversation state:
{json.dumps(existing_state, ensure_ascii=False)}

Is the system waiting for booking confirmation?
{state.stage == "awaiting_confirmation"}

Is the system waiting for appointment selection?
{state.stage == "awaiting_appointment_selection"}

Is the system waiting for cancellation confirmation?
{state.stage == "awaiting_cancel_confirmation"}

Appointments available for cancellation:
{json.dumps(state.cancellation_options, ensure_ascii=False)}

Is the system waiting for reschedule appointment selection?
{state.stage == "awaiting_reschedule_selection"}

Is the system waiting for reschedule confirmation?
{state.stage == "awaiting_reschedule_confirmation"}

Is the system waiting for a new reschedule date?
{state.stage == "awaiting_reschedule_date"}

Is the system waiting for a new reschedule time?
{state.stage == "awaiting_reschedule_time_selection"}

Appointments available for rescheduling:
{json.dumps(state.rescheduling_options, ensure_ascii=False)}

Latest patient message:
{transcript}

Extract the information from the latest message.
Use the existing state to understand context.
Do not overwrite existing information unless the patient
clearly provides a correction.
"""

    result = await structured_llm.ainvoke([
        (
            "system",
            EXTRACTION_SYSTEM_PROMPT
        ),
        (
            "human",
            user_prompt
        )
    ])

    return result


# ============================================================
# 7. COMPLETE ONE CONVERSATION TURN
# ============================================================

def process_doctor_availability(
    state: AppointmentState,
    extracted: AppointmentExtraction
) -> AppointmentState:
    if not state.service or not state.appointment_date:
        state.stage = "collecting_details"
        return state

    if state.stage == "awaiting_time_selection":
        if not state.appointment_time:
            extracted.clarification_needed = (
                "Please choose one of the previously displayed slots."
            )
            return state

        requested_time = None
        for time_format in ("%I:%M %p", "%I %p", "%H:%M", "%H"):
            try:
                requested_time = datetime.strptime(
                    state.appointment_time.strip(),
                    time_format
                ).time()
                break
            except ValueError:
                continue

        if requested_time is None:
            state.appointment_time = None
            extracted.clarification_needed = (
                "Please provide a valid time, such as 10:30 AM."
            )
            return state

        selected_slot = None
        # Compare the requested local time with available slots.
        for slot in state.available_slots:
            slot_datetime = datetime.fromisoformat(
                slot.replace("Z", "+00:00")
            ).astimezone(INDIA_TZ)
            if slot_datetime.time().replace(
                second=0, microsecond=0
            ) == requested_time:
                selected_slot = slot
                break

        if selected_slot is None:
            state.appointment_time = None
            extracted.clarification_needed = (
                "That time is not available. "
                "Please choose one of the previously displayed slots."
            )
            return state

        # Store the selected slot in UTC ISO format.
        state.appointment_time = selected_slot
        state.stage = "awaiting_confirmation"
        state.awaiting_confirmation = True
        state.confirmation = None
        local_selected_time = datetime.fromisoformat(
            selected_slot.replace("Z", "+00:00")
        ).astimezone(INDIA_TZ).strftime("%I:%M %p").lstrip("0")
        extracted.clarification_needed = (
            f"You selected {local_selected_time} with "
            f"{state.doctor_name} on {state.appointment_date}. "
            "Would you like me to confirm this appointment?"
        )
        return state

    if state.stage == "awaiting_doctor_selection":
        selected = next(
            (
                doctor for doctor in state.doctor_options
                if state.doctor_name
                and state.doctor_name.lower() in doctor["name"].lower()
            ),
            None
        )
        if not selected:
            extracted.clarification_needed = (
                "Please select one of the doctors from the list."
            )
            return state

        state.doctor_id = selected["doctor_id"]
        state.doctor_name = selected["name"]
        state.doctor_options = []
    else:
        doctors = find_doctors(
            specialization=state.service,
            doctor_name=state.doctor_name
        )
        if not doctors:
            extracted.clarification_needed = (
                f"No available doctors found in {state.service}. "
                "Would you like to choose another department?"
            )
            state.stage = "collecting_details"
            return state

        if len(doctors) > 1:
            state.doctor_options = doctors
            state.stage = "awaiting_doctor_selection"
            doctor_names = ", ".join(
                doctor["name"] for doctor in doctors
            )
            extracted.clarification_needed = (
                f"Multiple doctors are available: {doctor_names}. "
                "Which doctor would you prefer?"
            )
            return state

        selected = doctors[0]
        state.doctor_id = selected["doctor_id"]
        state.doctor_name = selected["name"]

    availability = check_doctor_availability(
        doctor_id=state.doctor_id,
        appointment_date=state.appointment_date
    )
    state.available_slots = [
        slot["start"]
        for slot in availability["slots"]
        if slot["available"]
    ]

    if not state.available_slots:
        state.stage = "collecting_details"
        extracted.clarification_needed = (
            f"No appointment slots are available with {state.doctor_name} "
            f"on {state.appointment_date}. Please choose another date."
        )
        return state

    state.stage = "awaiting_time_selection"
    local_times = [
        datetime.fromisoformat(
            slot.replace("Z", "+00:00")
        ).astimezone(INDIA_TZ).strftime("%I:%M %p").lstrip("0")
        for slot in state.available_slots
    ]
    extracted.clarification_needed = (
        "Available appointment times: "
        f"{', '.join(local_times)}. Which time would you prefer?"
    )

    return state


async def process_appointment_message(
    transcript: str,
    conversation_id: str,
    user_id: str,
    customer_name: str,
    customer_email: str
) -> tuple[AppointmentState, AppointmentExtraction]:
    state = await get_appointment_state(conversation_id)
    if state is None:
        state = await create_appointment_state(
            conversation_id=conversation_id,
            user_id=user_id
        )

    # Prevent another user from accessing this conversation.
    if state.user_id != user_id:
        raise PermissionError(
            "This appointment conversation belongs to another user."
        )

    previous_stage = state.stage
    extracted = await extract_appointment_intent(
        transcript=transcript,
        state=state
    )

    # --------------------------------------------------------
    # HANDLE APPOINTMENT SELECTION FOR CANCELLATION
    # --------------------------------------------------------
    if previous_stage == "awaiting_appointment_selection":
        selected_number = extracted.appointment_selection
        if (
            selected_number is None
            or selected_number < 1
            or selected_number > len(state.cancellation_options)
        ):
            appointment_list = []
            for index, appointment in enumerate(
                state.cancellation_options,
                start=1
            ):
                start = datetime.fromisoformat(
                    appointment["appointment_start"].replace(
                        "Z",
                        "+00:00"
                    )
                ).astimezone(INDIA_TZ)
                appointment_list.append(
                    f"{index}. {appointment['service']} on "
                    f"{start.strftime('%d %b %Y at %I:%M %p')}"
                )
            extracted.clarification_needed = (
                "Please select a valid appointment number. "
                + ". ".join(appointment_list)
            )
        else:
            selected = state.cancellation_options[
                selected_number - 1
            ]
            state.selected_cancellation_id = selected[
                "appointment_id"
            ]
            state.stage = "awaiting_cancel_confirmation"
            selected_start = datetime.fromisoformat(
                selected["appointment_start"].replace(
                    "Z",
                    "+00:00"
                )
            ).astimezone(INDIA_TZ)
            extracted.clarification_needed = (
                f"Do you want to cancel the {selected['service']} "
                f"appointment on "
                f"{selected_start.strftime('%d %b %Y at %I:%M %p')}?"
            )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # HANDLE APPOINTMENT SELECTION FOR RESCHEDULING
    # --------------------------------------------------------
    if previous_stage == "awaiting_reschedule_selection":
        selected_number = extracted.appointment_selection
        if (
            selected_number is None
            or selected_number < 1
            or selected_number > len(state.rescheduling_options)
        ):
            appointment_list = []
            for index, appointment in enumerate(
                state.rescheduling_options,
                start=1
            ):
                start = datetime.fromisoformat(
                    appointment["appointment_start"].replace(
                        "Z",
                        "+00:00"
                    )
                ).astimezone(INDIA_TZ)
                appointment_list.append(
                    f"{index}. {appointment['service']} on "
                    f"{start.strftime('%d %b %Y at %I:%M %p')}"
                )
            extracted.clarification_needed = (
                "Please select a valid appointment number. "
                + ". ".join(appointment_list)
            )
        else:
            selected = state.rescheduling_options[
                selected_number - 1
            ]
            state.selected_reschedule_id = selected["appointment_id"]
            state.appointment_id = selected["appointment_id"]
            state.doctor_id = selected["doctor_id"]
            state.doctor_name = selected.get("doctor_name")
            state.service = selected["service"]
            state.appointment_date = None
            state.appointment_time = None
            state.available_slots = []
            state.stage = "awaiting_reschedule_date"
            selected_start = datetime.fromisoformat(
                selected["appointment_start"].replace(
                    "Z",
                    "+00:00"
                )
            ).astimezone(INDIA_TZ)
            extracted.clarification_needed = (
                f"You selected your {selected['service']} appointment "
                f"on {selected_start.strftime('%d %b %Y at %I:%M %p')}. "
                "What new date would you prefer?"
            )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # HANDLE CANCELLATION CONFIRMATION
    # --------------------------------------------------------
    if previous_stage == "awaiting_cancel_confirmation":
        if extracted.confirmation is True:
            try:
                cancel_appointment_record(
                    appointment_id=state.selected_cancellation_id,
                    user_id=user_id,
                    role="user"
                )
                state.stage = "cancelled"
                state.awaiting_confirmation = False
                state.confirmation = True
                state.cancellation_options = []
                state.selected_cancellation_id = None
                extracted.clarification_needed = (
                    "Your appointment has been cancelled successfully."
                )
            except HTTPException as error:
                state.stage = "failed"
                extracted.clarification_needed = str(error.detail)
            except Exception:
                state.stage = "failed"
                extracted.clarification_needed = (
                    "I could not cancel your appointment. "
                    "Please try again."
                )
        elif extracted.confirmation is False:
            state.stage = "collecting_details"
            state.confirmation = False
            state.awaiting_confirmation = False
            state.cancellation_options = []
            state.selected_cancellation_id = None
            extracted.clarification_needed = (
                "No problem. I haven't cancelled the appointment."
            )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # START APPOINTMENT CANCELLATION
    # --------------------------------------------------------
    if extracted.intent == "cancel_booking":
        scheduled = get_scheduled_appointments(user_id)
        if not scheduled:
            state.stage = "collecting_details"
            state.cancellation_options = []
            state.selected_cancellation_id = None
            extracted.clarification_needed = (
                "You don't have any upcoming scheduled appointments."
            )
        else:
            state.cancellation_options = scheduled
            state.selected_cancellation_id = None
            state.stage = "awaiting_appointment_selection"

            appointment_list = []
            for index, appointment in enumerate(
                scheduled,
                start=1
            ):
                start = datetime.fromisoformat(
                    appointment["appointment_start"].replace(
                        "Z",
                        "+00:00"
                    )
                ).astimezone(INDIA_TZ)
                appointment_list.append(
                    f"{index}. {appointment['service']} on "
                    f"{start.strftime('%d %b %Y at %I:%M %p')}"
                )
            extracted.clarification_needed = (
                "Which appointment would you like to cancel? "
                + ". ".join(appointment_list)
            )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # START APPOINTMENT RESCHEDULING
    # --------------------------------------------------------
    if (
        extracted.intent == "reschedule_booking"
        and previous_stage not in {
            "awaiting_reschedule_selection",
            "awaiting_reschedule_date",
            "awaiting_reschedule_time_selection",
            "awaiting_reschedule_confirmation"
        }
    ):
        scheduled = get_scheduled_appointments(user_id)
        if not scheduled:
            state.stage = "collecting_details"
            state.rescheduling_options = []
            state.selected_reschedule_id = None
            extracted.clarification_needed = (
                "You don't have any upcoming scheduled appointments "
                "to reschedule."
            )
        else:
            state.rescheduling_options = scheduled
            state.selected_reschedule_id = None
            state.stage = "awaiting_reschedule_selection"

            appointment_list = []
            for index, appointment in enumerate(
                scheduled,
                start=1
            ):
                start = datetime.fromisoformat(
                    appointment["appointment_start"].replace(
                        "Z",
                        "+00:00"
                    )
                ).astimezone(INDIA_TZ)
                appointment_list.append(
                    f"{index}. {appointment['service']} on "
                    f"{start.strftime('%d %b %Y at %I:%M %p')}"
                )
            extracted.clarification_needed = (
                "Which appointment would you like to reschedule? "
                + ". ".join(appointment_list)
            )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # HANDLE NEW DATE FOR APPOINTMENT RESCHEDULING
    # --------------------------------------------------------
    if previous_stage == "awaiting_reschedule_date":
        if not extracted.appointment_date:
            extracted.clarification_needed = (
                "Please tell me the new appointment date."
            )
            await save_appointment_state(state)
            return state, extracted

        try:
            new_date = datetime.strptime(
                extracted.appointment_date,
                "%Y-%m-%d"
            ).date()
        except ValueError:
            extracted.clarification_needed = (
                "Please provide a valid date in YYYY-MM-DD format."
            )
            await save_appointment_state(state)
            return state, extracted

        if new_date <= datetime.now(INDIA_TZ).date():
            extracted.clarification_needed = (
                "Please choose a future date."
            )
            await save_appointment_state(state)
            return state, extracted

        try:
            availability = check_doctor_availability(
                doctor_id=state.doctor_id,
                appointment_date=new_date.isoformat()
            )
        except HTTPException as error:
            extracted.clarification_needed = str(error.detail)
            await save_appointment_state(state)
            return state, extracted

        state.appointment_date = new_date.isoformat()
        state.available_slots = [
            slot["start"]
            for slot in availability["slots"]
            if slot["available"]
        ]

        if not state.available_slots:
            extracted.clarification_needed = (
                f"No appointment slots are available on "
                f"{new_date.strftime('%d %b %Y')}. "
                "Please choose another date."
            )
            await save_appointment_state(state)
            return state, extracted

        state.stage = "awaiting_reschedule_time_selection"
        state.appointment_time = None
        local_times = [
            datetime.fromisoformat(
                slot.replace("Z", "+00:00")
            ).astimezone(INDIA_TZ).strftime("%I:%M %p").lstrip("0")
            for slot in state.available_slots
        ]
        extracted.clarification_needed = (
            "Available appointment times: "
            f"{', '.join(local_times)}. "
            "Which new time would you prefer?"
        )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # HANDLE TIME SELECTION FOR RESCHEDULING
    # --------------------------------------------------------
    if previous_stage == "awaiting_reschedule_time_selection":
        if not extracted.appointment_time:
            extracted.clarification_needed = (
                "Please tell me which available time you prefer."
            )
            await save_appointment_state(state)
            return state, extracted

        selected_time = extracted.appointment_time
        selected_slot = None
        for slot in state.available_slots:
            slot_value = (
                slot["start"]
                if isinstance(slot, dict)
                else slot
            )
            slot_start = datetime.fromisoformat(
                slot_value.replace("Z", "+00:00")
            ).astimezone(INDIA_TZ)
            if slot_start.strftime("%H:%M") == selected_time:
                selected_slot = slot_value
                break

        if not selected_slot:
            extracted.clarification_needed = (
                "That time is not available. "
                "Please select one of the available times."
            )
            await save_appointment_state(state)
            return state, extracted

        state.appointment_time = selected_time
        state.stage = "awaiting_reschedule_confirmation"
        state.awaiting_confirmation = True
        state.confirmation = None
        local_selected_time = datetime.fromisoformat(
            selected_slot.replace("Z", "+00:00")
        ).astimezone(INDIA_TZ).strftime("%I:%M %p").lstrip("0")
        extracted.clarification_needed = (
            f"Would you like to reschedule the appointment to "
            f"{local_selected_time} on {state.appointment_date}?"
        )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # HANDLE RESCHEDULING CONFIRMATION
    # --------------------------------------------------------
    if previous_stage == "awaiting_reschedule_confirmation":
        if extracted.confirmation is True:
            if (
                not state.appointment_date
                or not state.appointment_time
                or not state.selected_reschedule_id
            ):
                state.stage = "failed"
                state.awaiting_confirmation = False
                extracted.clarification_needed = (
                    "I could not find the selected appointment details. "
                    "Please start the rescheduling process again."
                )
            else:
                try:
                    new_start = datetime.strptime(
                        f"{state.appointment_date} "
                        f"{state.appointment_time}",
                        "%Y-%m-%d %H:%M"
                    ).replace(tzinfo=INDIA_TZ)
                    state.stage = "rescheduling"
                    await save_appointment_state(state)
                    reschedule_appointment_record(
                        appointment_id=state.selected_reschedule_id,
                        new_start=new_start,
                        user_id=user_id,
                        role="customer"
                    )
                    state.stage = "rescheduled"
                    state.awaiting_confirmation = False
                    state.confirmation = True
                    state.rescheduling_options = []
                    state.selected_reschedule_id = None
                    extracted.clarification_needed = (
                        "Your appointment has been successfully rescheduled "
                        f"to {new_start.strftime('%d %B %Y at %I:%M %p')}."
                    )
                except HTTPException as exc:
                    state.awaiting_confirmation = False
                    state.appointment_time = None
                    try:
                        availability = check_doctor_availability(
                            doctor_id=state.doctor_id,
                            appointment_date=datetime.strptime(
                                state.appointment_date,
                                "%Y-%m-%d"
                            ).date()
                        )
                    except HTTPException as availability_error:
                        state.stage = "awaiting_reschedule_date"
                        state.available_slots = []
                        extracted.clarification_needed = str(
                            availability_error.detail
                        )
                    else:
                        state.available_slots = [
                            slot["start"]
                            for slot in availability["slots"]
                            if slot["available"]
                        ]
                        if state.available_slots:
                            state.stage = "awaiting_reschedule_time_selection"
                            local_times = [
                                datetime.fromisoformat(
                                    slot.replace("Z", "+00:00")
                                ).astimezone(INDIA_TZ).strftime(
                                    "%I:%M %p"
                                ).lstrip("0")
                                for slot in state.available_slots
                            ]
                            extracted.clarification_needed = (
                                f"{exc.detail}. Available times are: "
                                f"{', '.join(local_times)}. "
                                "Please choose another time."
                            )
                        else:
                            state.stage = "awaiting_reschedule_date"
                            extracted.clarification_needed = (
                                f"No appointment times are available on "
                                f"{state.appointment_date}. "
                                "Please choose another date."
                            )
                except ValueError:
                    state.stage = "awaiting_reschedule_date"
                    state.awaiting_confirmation = False
                    state.appointment_time = None
                    extracted.clarification_needed = (
                        "Please choose a valid new appointment date and time."
                    )
                except Exception:
                    logger.exception(
                        "Unexpected error while rescheduling appointment"
                    )
                    state.stage = "awaiting_reschedule_date"
                    state.awaiting_confirmation = False
                    state.appointment_time = None
                    extracted.clarification_needed = (
                        "Something went wrong while rescheduling your "
                        "appointment. Please try again by providing a new date."
                    )
        elif extracted.confirmation is False:
            state.stage = "collecting_details"
            state.confirmation = False
            state.awaiting_confirmation = False
            state.rescheduling_options = []
            state.selected_reschedule_id = None
            state.available_slots = []
            state.appointment_date = None
            state.appointment_time = None
            extracted.clarification_needed = (
                "No problem. I haven't rescheduled the appointment."
            )
        else:
            extracted.clarification_needed = (
                "Please confirm with yes if you want to reschedule, "
                "or no if you do not."
            )

        await save_appointment_state(state)
        return state, extracted

    # --------------------------------------------------------
    # HANDLE PATIENT CONFIRMATION
    # --------------------------------------------------------
    if previous_stage == "awaiting_confirmation":
        # Patient confirmed the appointment
        if extracted.confirmation is True:
            if not state.appointment_time or not state.doctor_id:
                state.stage = "failed"
                state.awaiting_confirmation = False
                extracted.clarification_needed = (
                    "I could not find the selected appointment details. "
                    "Please start the booking again."
                )
            else:
                state.stage = "booking"
                try:
                    appointment_start = datetime.fromisoformat(
                        state.appointment_time.replace("Z", "+00:00")
                    )
                    payload = AppointmentCreate(
                        doctor_id=state.doctor_id,
                        service=state.service,
                        appointment_start=appointment_start,
                        reason=state.reason
                    )
                    booking_result = create_appointment_record(
                        payload=payload,
                        user_id=user_id,
                        customer_name=customer_name,
                        customer_email=customer_email
                    )
                    state.appointment_id = booking_result["appointment_id"]
                    state.stage = "booked"
                    state.awaiting_confirmation = False
                    state.confirmation = True
                    extracted.clarification_needed = (
                        "Your appointment has been booked successfully."
                    )
                except HTTPException as error:
                    state.stage = "failed"
                    state.awaiting_confirmation = False
                    extracted.clarification_needed = str(error.detail)
                except Exception:
                    state.stage = "failed"
                    state.awaiting_confirmation = False
                    extracted.clarification_needed = (
                        "I could not complete your appointment booking. "
                        "Please try again."
                    )
        elif extracted.confirmation is False:
            state.stage = "cancelled"
            state.awaiting_confirmation = False
            state.confirmation = False
            extracted.clarification_needed = (
                "No problem. I haven't booked the appointment."
            )

        await save_appointment_state(state)
        return state, extracted

    if extracted.clarification_needed:
        await save_appointment_state(state)
        return state, extracted

    state = merge_extracted_details(state, extracted)
    missing_details = get_missing_details(state)

    if missing_details:
        state.stage = "collecting_details"
    elif (
        previous_stage in {
            "collecting_details",
            "ready_for_availability",
            "awaiting_doctor_selection",
            "awaiting_time_selection"
        }
        or extracted.service
        or extracted.appointment_date
    ):
        state = process_doctor_availability(state, extracted)

    await save_appointment_state(state)
    return state, extracted
