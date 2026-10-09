import asyncio
import contextlib
import json
import time

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from config import RAG_DEFAULT_BUSINESS_ID

from config import DEEPGRAM_API_KEY
from services.chat import generate_response
from services.text_to_speech import (
    SAMPLE_RATE,
    StreamingSpeech,
)

router = APIRouter()

STT_URL = (
    "wss://api.deepgram.com/v2/listen"
    "?model=flux-general-multi"
)

SETTLE_SECONDS = 0.4

PARTIAL_EVENTS = {
    "Update",
    "StartOfTurn",
    "TurnResumed",
    "EagerEndOfTurn",
}


def parse_flux_message(message: str) -> tuple[str, str]:
    data = json.loads(message)

    message_type = data.get("type")

    if message_type != "TurnInfo":
        if message_type in ("Error", "Warning"):
            print("Deepgram:", data)

        return "", ""

    event = data.get("event") or ""

    transcript = (
        data.get("transcript") or ""
    ).strip()

    return event, transcript


@router.websocket("/voice")
async def voice(websocket: WebSocket):
    speaking = asyncio.Event()
    current_turn_task = None

    await websocket.accept()

    print("Browser WebSocket connected")

    try:
        async with websockets.connect(
            STT_URL,
            additional_headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}"
            },
        ) as stt, StreamingSpeech() as tts:

            print("Connected to Deepgram Flux + TTS")

            turn_queue: asyncio.Queue[str] = asyncio.Queue()

            # True while AI is generating/speaking.
            speaking = asyncio.Event()

            # Used to cancel the currently running AI response.
            current_turn_task = None

            # Prevents multiple interruption signals for
            # the same AI response.
            interruption_lock = asyncio.Lock()

            async def send_json(data: dict):
                """Safely send JSON to the browser."""
                try:
                    await websocket.send_text(
                        json.dumps(data)
                    )
                except Exception:
                    pass

            async def interrupt_ai():
                nonlocal current_turn_task

                if not speaking.is_set():
                    return

                print("AI interrupted by caller")

                # Tell browser to immediately stop
                # currently playing audio.
                await send_json({
                    "type": "interrupt"
                })

                if current_turn_task is not None:
                    if not current_turn_task.done():
                        current_turn_task.cancel()

                speaking.clear()

            async def mic_to_stt():
                """
                Browser microphone -> Deepgram.

                This task NEVER waits for Groq or TTS.
                """
                try:
                    while True:

                        audio_chunk = (
                            await websocket.receive_bytes()
                        )

                        await stt.send(audio_chunk)

                except WebSocketDisconnect:
                    print("Browser disconnected")
                    raise

            async def stt_to_queue():
                """
                Deepgram Flux -> transcripts.

                Detects both normal turns and caller interruption.
                """

                async for message in stt:

                    event, transcript = (
                        parse_flux_message(message)
                    )

                    if not transcript:
                        continue

                    print(
                        "Flux:",
                        event,
                        "-",
                        transcript,
                    )

                    # -------------------------------------------------
                    # CALLER INTERRUPTS AI
                    # -------------------------------------------------

                    if speaking.is_set():

                        # We only interrupt once Deepgram has enough
                        # information to indicate that the caller
                        # actually started a turn.
                        if event in {
                            "StartOfTurn",
                            "EagerEndOfTurn",
                            "EndOfTurn",
                        }:

                            await interrupt_ai()

                            # If this is EndOfTurn, the transcript
                            # should immediately become a new turn.
                            if event == "EndOfTurn":

                                await send_json({
                                    "type": "transcript",
                                    "transcript": transcript,
                                    "is_final": True,
                                })

                                await turn_queue.put(
                                    transcript
                                )

                            else:

                                await send_json({
                                    "type": "transcript",
                                    "transcript": transcript,
                                    "is_final": False,
                                })

                        continue

                    # -------------------------------------------------
                    # NORMAL USER TURN
                    # -------------------------------------------------

                    if event == "EndOfTurn":

                        await send_json({
                            "type": "transcript",
                            "transcript": transcript,
                            "is_final": True,
                        })

                        await turn_queue.put(
                            transcript
                        )

                        continue

                    # -------------------------------------------------
                    # LIVE TRANSCRIPT
                    # -------------------------------------------------

                    if event in PARTIAL_EVENTS:

                        await send_json({
                            "type": "transcript",
                            "transcript": transcript,
                            "is_final": False,
                        })

                raise RuntimeError(
                    "Deepgram STT connection closed"
                )

            async def handle_turn(
                transcript: str
            ):
                """
                Generate AI response and stream TTS.

                This entire function becomes cancellable when
                the caller interrupts the AI.
                """

                nonlocal current_turn_task

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

                try:

                    await send_json({
                        "type": "ai_thinking"
                    })

                    # ---------------------------------------------
                    # GROQ
                    # ---------------------------------------------

                    if not RAG_DEFAULT_BUSINESS_ID:
                        await send_json({"type": "fallback","message": "The receptionist is not fully configured yet."})
                        return

                    answer = await generate_response(transcript,business_id=RAG_DEFAULT_BUSINESS_ID,)

                    await send_json({
                        "type": "ai_response",
                        "response": answer,
                    })

                    # ---------------------------------------------
                    # TTS
                    # ---------------------------------------------

                    await tts.speak(
                        answer,
                        forward,
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

                    transcript = (
                        await turn_queue.get()
                    )

                    try:

                        # Create a separate task so that
                        # interrupt_ai() can cancel it.
                        current_turn_task = (
                            asyncio.create_task(
                                handle_turn(
                                    transcript
                                )
                            )
                        )

                        await current_turn_task

                    except asyncio.CancelledError:

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
