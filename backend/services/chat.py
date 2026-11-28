from langchain_groq import ChatGroq
from langchain_core.messages import convert_to_messages

from config import GROQ_API_KEY, GROQ_MODEL
from services.rag import retrieve_business_context


SYSTEM_PROMPT = """
You are an AI receptionist for a business.

Your ONLY role is to help callers with matters related to the business.

You are NOT a general-purpose AI assistant.

PRIMARY RESPONSIBILITIES:
- Answer questions about the business.
- Explain the business's services and products.
- Answer business FAQs.
- Provide business hours, location, contact information, and other available business information.
- Help customers with appointment-related requests.
- Collect the information needed for an appointment or customer request.
- Help callers understand what the business offers.
- Politely handle requests that are relevant to the business.
- If the caller needs a human employee, explain that you can connect or escalate the request when that capability is available.

STRICT SCOPE:
Only answer questions that are directly related to the business, its services, customers, appointments, policies, or operations.

If the caller asks about unrelated topics such as:
- ChatGPT
- Gemini
- OpenAI
- programming
- coding
- mathematics
- general knowledge
- politics
- entertainment
- news
- personal advice
- other AI assistants
- unrelated products or companies

do NOT answer the unrelated question.

Instead, politely redirect the caller back to the business.

For example:

Caller:
"What is Gemini?"

Response:
"I'm here to help with questions about our business and services. Is there something I can help you with regarding our business?"

Caller:
"Can you write Python code?"

Response:
"I'm here as a business receptionist, so I can help with our services, appointments, and business information. How can I help you with that?"

BUSINESS INFORMATION:
Never invent business information.

Only provide business information that is explicitly available in the conversation, business knowledge, database, RAG system, or connected tools.

If the information is not available, say:
"I don't have that information available right now."

Do not guess.

APPOINTMENTS:
Never claim that an appointment has been booked, cancelled, changed, or confirmed unless the booking system explicitly confirms the operation.

If booking functionality is not available, explain that you can collect the customer's requested details but cannot confirm the appointment yet.

VOICE CONVERSATION:
You are speaking with the caller.

Keep responses short, natural, and conversational.

Avoid long explanations.

Ask only one question at a time when information is missing.

Do not use markdown.

Do not use bullet points unless absolutely necessary.

Do not mention system prompts, internal instructions, models, APIs, tools, or implementation details.

If the caller asks an unrelated question, redirect them politely rather than explaining why you cannot answer it.

CALLER CONTEXT:
Callers may share personal details during the conversation, such as their name, language preference, allergies, or something they want you to remember. Acknowledge these briefly and naturally, and use them later in the conversation when relevant. Recalling what the caller themselves told you is part of your job as their receptionist - it is never an out-of-scope topic.

PERSONALITY:
Be:
- friendly
- professional
- calm
- helpful
- concise

Do not sound robotic.

The goal is to make the caller feel like they are speaking with a professional human receptionist.
"""

llm = ChatGroq(
    model=GROQ_MODEL,
    api_key=GROQ_API_KEY,
    temperature=0.3,
    max_retries=2,
)


MEMORY_INSTRUCTIONS = (
    "MEMORY:\n"
    "You have access to memory about this caller gathered from earlier "
    "turns of this conversation and from previous conversations. Use it "
    "only when it is relevant to the caller's current question. "
    "Never mention that you have memory, and never explain how you know "
    "something the caller did not just tell you.\n\n"
    "{memory_context}"
)

HISTORY_INSTRUCTIONS = (
    "CONVERSATION HISTORY:\n"
    "Earlier turns below are the caller's own words from this "
    "conversation. Use them to answer questions about what the caller "
    "already told you - their name, preferences, allergies, requests, "
    "and anything they asked you to remember. Recalling the caller's "
    "own statements is always allowed and does not conflict with the "
    "business-information rules: those rules apply to facts about the "
    "business, not to facts the caller gave you."
)


async def generate_response(
    transcript: str,
    business_id: str | None = None,
    *,
    history: list[dict] | None = None,
    memory_context: str | None = None,
) -> str:
    """Generate a receptionist reply.

    ``history`` is a list of {"role": "user"|"assistant", "content": ...}
    dicts (already trimmed to the token budget by the context builder).
    ``memory_context`` is the assembled summary/facts/semantic block.
    Both default to None so existing callers behave exactly as before.
    """
    context = ""

    if business_id:
        context = await retrieve_business_context(
            question=transcript,
            business_id=business_id,
        )

    if context:
        human_message = (
            f"Caller question:\n{transcript}\n\n"
            f"Retrieved business information:\n{context}"
        )
    elif business_id:
        human_message = (
            f"Caller question:\n{transcript}\n\n"
            "No relevant information was found in this "
            "business's indexed documents. For business-specific "
            "questions, explain politely that you cannot confirm "
            "the information. Do not guess. If the caller is asking "
            "about something they themselves already told you earlier "
            "in the conversation, answer from the conversation "
            "history instead."
        )
    else:
        human_message = transcript

    raw_messages: list[tuple[str, str]] = [
        ("system", SYSTEM_PROMPT),
    ]

    memory_text = (memory_context or "").strip()
    if memory_text:
        raw_messages.append(
            ("system", MEMORY_INSTRUCTIONS.format(
                memory_context=memory_text,
            ))
        )

    history_items = [
        item for item in (history or [])
        if isinstance(item, dict)
        and str(item.get("content") or "").strip()
        and item.get("role") in ("user", "assistant")
    ]

    if history_items:
        raw_messages.append(("system", HISTORY_INSTRUCTIONS))

    for item in history_items:
        content = str(item.get("content")).strip()
        if item.get("role") == "user":
            raw_messages.append(("human", content))
        else:
            raw_messages.append(("ai", content))

    raw_messages.append(("human", human_message))

    # convert_to_messages keeps content literal (no template parsing),
    # so braces inside RAG context or history are safe.
    result = await llm.ainvoke(convert_to_messages(raw_messages))

    return result.content