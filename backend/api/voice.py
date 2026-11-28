import asyncio
import contextlib
import json
import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import SESSION_COOKIE_NAME
from database.redis import get_session
from services.memory.updater import schedule_memory_update
from services.orchestrator import run_turn
from services.speech_to_text import SarvamSTT
from services.text_to_speech import (
    SAMPLE_RATE,
    StreamingSpeech,
)
# For the Memory saving Feature 
from starlette.concurrency import run_in_threadpool

from services.conversation_memory import (
    start_conversation,
    save_message,
    end_conversation,
)
router = APIRouter()

SETTLE_SECONDS = 0.4

DEFAULT_LANGUAGE = "en-IN"

# Languages Sarvam Bulbul can speak. STT can detect more (e.g. Santali,
# Bodo); anything outside this map falls back to DEFAULT_LANGUAGE so the
# reply can always be spoken.
LANGUAGE_NAMES = {
    "en-IN": "English",
    "hi-IN": "Hindi",
    "bn-IN": "Bengali",
    "ta-IN": "Tamil",
    "te-IN": "Telugu",
    "kn-IN": "Kannada",
    "ml-IN": "Malayalam",
    "mr-IN": "Marathi",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    "od-IN": "Odia",
}


def speakable_language(code: str | None) -> str:
    return code if code in LANGUAGE_NAMES else DEFAULT_LANGUAGE


@router.websocket("/voice")
async def voice(websocket: WebSocket):
    # Authenticate before accepting the connection.
    current_user = await authenticate_websocket(websocket)
    if not current_user:
        await websocket.close(code=1008, reason="Authentication required")
        return

    try:
        conversation_id = await run_in_threadpool(
            start_conversation,
            str(current_user["user_id"]),
        )
    except Exception as error:
        print("Could not start conversation:", repr(error))
        await websocket.close(
            code=1011,
            reason="Conversation storage unavailable",
        )
        return
    # Language the caller chose in the UI (?lang=hi-IN). Used for speech
    # recognition, the AI reply and the voice, instead of auto-detection.
    selected_language = speakable_language(
        websocket.query_params.get("lang")
    )
    print(f"Appointment conversation ID: {conversation_id}")
    print(f"Selected language: {selected_language}")
    print(
        f"Authenticated voice user: {current_user['user_id']}"
    )

    await websocket.accept()

    print("Browser WebSocket connected")
    async def persist_message(role: str, content: str):
        try:
            await run_in_threadpool(
                save_message,
                conversation_id,
                str(current_user["user_id"]),
                role,
                content,
            )
        except Exception as error:
            # History failure should not interrupt the live voice session.
            print("Conversation memory save failed:", repr(error))

    try:
        stt_mode = "transcribe" if selected_language == "en-IN" else "codemix"

        async with SarvamSTT(
            language_code=selected_language,
            mode=stt_mode,
        ) as stt, StreamingSpeech(selected_language) as tts:

            print("Connected to Sarvam STT + TTS")

            # (transcript, language_code)
            turn_queue: asyncio.Queue[tuple[str, str]] = asyncio.Queue()

            # True while AI is generating/speaking.
            speaking = asyncio.Event()

            # Used to cancel the currently running AI response.
            current_turn_task = None

            async def send_json(data: dict):
                """Safely send JSON to the browser."""
                try:
                    await websocket.send_text(
                        json.dumps(data)
                    )
                except Exception:
                    pass

            async def interrupt_ai():
                if not speaking.is_set():
                    return

                print("AI interrupted by caller")

                # Tell browser to immediately stop
                # currently playing audio.
                await send_json({
                    "type": "interrupt"
                })

                # Cancelling the turn also closes the TTS socket
                # (Sarvam has no in-band cancel).
                if current_turn_task is not None:
                    if not current_turn_task.done():
                        current_turn_task.cancel()

                speaking.clear()

            async def mic_to_stt():
                """
                Browser microphone (16 kHz PCM16) -> Sarvam STT.

                This task NEVER waits for the LLM or TTS.
                """
                try:
                    while True:

                        audio_chunk = (
                            await websocket.receive_bytes()
                        )

                        await stt.send_pcm(audio_chunk)

                except WebSocketDisconnect:
                    print("Browser disconnected")
                    raise

            async def stt_to_queue():
                """
                Sarvam STT events -> barge-in + finished transcripts.
                """

                async for event in stt.events():

                    event_type = event["type"]

                    # -------------------------------------------------
                    # CALLER STARTS TALKING (barge-in)
                    # -------------------------------------------------

                    if event_type == "speech_start":

                        await interrupt_ai()

                        continue

                    # -------------------------------------------------
                    # FINISHED USER TURN
                    # -------------------------------------------------

                    if event_type == "transcript":

                        transcript = event["text"]

                        # The caller picked the language up front, so use
                        # it rather than Sarvam's per-utterance guess.
                        language = selected_language

                        print(
                            "STT:",
                            language,
                            f"(detected {event.get('language')})",
                            "-",
                            transcript,
                        )

                        # Speech-start can be missed; a transcript
                        # while the AI is still talking is an interrupt.
                        await interrupt_ai()

                        await send_json({
                            "type": "transcript",
                            "transcript": transcript,
                            "is_final": True,
                            "language": language,
                        })
                        
                        await persist_message("user", transcript)
                        await turn_queue.put(
                            (transcript, language)
                        )

                        continue

                    if event_type == "error":
                        print("Sarvam STT error:", event["message"])
                        continue

                    if event_type == "closed":
                        raise RuntimeError(
                            "Sarvam STT connection closed: "
                            + event.get("message", "")
                        )

                    # "speech_end": nothing to do, the transcript
                    # event carries the result.

                raise RuntimeError(
                    "Sarvam STT connection closed"
                )

            async def handle_turn(
                transcript: str,
                language: str,
            ):
                """
                Generate AI response and stream TTS.

                This entire function becomes cancellable when
                the caller interrupts the AI.
                """

                speaking.set()

                state = {
                    "started_at": None,
                    "bytes": 0,
                }

                async def forward(chunk: bytes):

                    if state["started_at"] is None:
                        state["started_at"] = (
                            time.monotonic()
                        )

                    state["bytes"] += len(chunk)

                    await websocket.send_bytes(
                        chunk
                    )

                caller_language = speakable_language(language)

                try:

                    await send_json({
                        "type": "ai_thinking"
                    })

                    # ---------------------------------------------
                    # ANSWER (LangGraph orchestrator: memory,
                    # routing, RAG / appointment tools, LLM)
                    # ---------------------------------------------
                    result = await run_turn(
                        user_id=current_user["user_id"],
                        conversation_id=conversation_id,
                        language=caller_language,
                        language_name=LANGUAGE_NAMES.get(
                            caller_language,
                            "English",
                        ),
                        transcript=transcript,
                        user_name=current_user.get("name") or "",
                        user_email=current_user.get("email") or "",
                    )

                    answer = result.get("response") or ""
                    reply_language = (
                        result.get("reply_language") or caller_language
                    )

                    await persist_message("assistant", answer)

                    # Background: rolling summary, long-term facts and
                    # semantic indexing (never blocks the voice turn).
                    schedule_memory_update(
                        str(current_user["user_id"]),
                        conversation_id,
                        transcript,
                        answer,
                    )

                    await send_json({
                        "type": "ai_response",
                        "response": answer,
                        "language": reply_language,
                    })

                    # ---------------------------------------------
                    # TTS
                    # ---------------------------------------------

                    await tts.speak(
                        answer,
                        forward,
                        language_code=reply_language,
                    )

                    # ---------------------------------------------
                    # AUDIO SETTLE
                    # ---------------------------------------------

                    if state["started_at"] is not None:

                        audio_seconds = (
                            state["bytes"]
                            / (SAMPLE_RATE * 2)
                        )

                        elapsed = (
                            time.monotonic()
                            - state["started_at"]
                        )

                        await asyncio.sleep(
                            max(
                                0.0,
                                audio_seconds - elapsed,
                            )
                            + SETTLE_SECONDS
                        )

                except asyncio.CancelledError:

                    print(
                        "Current AI response cancelled"
                    )

                    # Important:
                    # do NOT treat cancellation as an error.
                    raise

                finally:

                    with contextlib.suppress(
                        Exception
                    ):

                        await send_json({
                            "type": "ai_done"
                        })

                    speaking.clear()

            async def turn_worker():

                nonlocal current_turn_task

                while True:

                    transcript, language = (
                        await turn_queue.get()
                    )

                    try:

                        # Create a separate task so that
                        # interrupt_ai() can cancel it.
                        current_turn_task = (
                            asyncio.create_task(
                                handle_turn(
                                    transcript,
                                    language,
                                )
                            )
                        )

                        await current_turn_task

                    except asyncio.CancelledError:

                        # If the worker itself is being shut down, let the
                        # cancellation through. Swallowing it would leave
                        # this loop alive and hang the session cleanup.
                        if asyncio.current_task().cancelling():
                            raise

                        # Otherwise only the AI turn was cancelled (barge-in).
                        print(
                            "AI turn cancelled"
                        )

                    except Exception as error:

                        print(
                            "Turn error:",
                            repr(error),
                        )

                        speaking.clear()

                        # -----------------------------------------
                        # AI FALLBACK
                        # -----------------------------------------

                        await send_json({
                            "type": "fallback",
                            "message": (
                                "I'm sorry, "
                                "I'm having trouble "
                                "processing that right now. "
                                "Could you please try again?"
                            ),
                        })

                    finally:

                        current_turn_task = None

            tasks = [
                asyncio.create_task(
                    mic_to_stt()
                ),
                asyncio.create_task(
                    stt_to_queue()
                ),
                asyncio.create_task(
                    turn_worker()
                ),
            ]

            try:

                await asyncio.wait(
                    tasks,
                    return_when=asyncio.FIRST_EXCEPTION,
                )

                for task in tasks:

                    if task.cancelled():
                        continue

                    error = task.exception()

                    if isinstance(
                        error,
                        WebSocketDisconnect,
                    ):
                        continue

                    if error is not None:
                        raise error

            finally:

                for task in tasks:
                    task.cancel()

                await asyncio.gather(
                    *tasks,
                    return_exceptions=True,
                )

    except WebSocketDisconnect:

        print(
            "Browser disconnected"
        )

    except Exception as error:

        print(
            "Voice error:",
            repr(error),
        )

        # Tell the browser WHY the session died instead of
        # letting it show an empty WebSocket error.
        with contextlib.suppress(Exception):
            await websocket.send_text(
                json.dumps({
                    "type": "error",
                    "message": (
                        "Voice service is unavailable."
                    ),
                })
            )
    finally:
        try:
            await run_in_threadpool(
                end_conversation,
                conversation_id,
                str(current_user["user_id"]),
            )
        except Exception as error:
            print("Could not end conversation:", repr(error))


async def authenticate_websocket(
    websocket: WebSocket
):
    # Read the HttpOnly session cookie.
    session_id = websocket.cookies.get(SESSION_COOKIE_NAME)

    if not session_id:
        return None

    # Validate the session using Redis.
    session_data = await get_session(session_id)

    if not session_data:
        return None

    return {
        "user_id": session_data.get("user_id"),
        "name": session_data.get("name"),
        "email": session_data.get("email"),
        "role": session_data.get("role", "user"),
    }