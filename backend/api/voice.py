import asyncio
import contextlib
import json
import time

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import DEEPGRAM_API_KEY
from services.chat import generate_response
from services.text_to_speech import (
    SAMPLE_RATE,
    StreamingSpeech,
)

router = APIRouter()

STT_URL = (
    "wss://api.deepgram.com/v2/listen"
    "?model=flux-general-en"
)

# Extra time after the streamed audio ends so the browser can
# finish playing before the mic is allowed to start a new turn.
SETTLE_SECONDS = 0.4

# Flux TurnInfo events that carry an in-progress transcript.
PARTIAL_EVENTS = {
    "Update",
    "StartOfTurn",
    "TurnResumed",
    "EagerEndOfTurn",
}


def parse_flux_message(message: str) -> tuple[str, str]:
    """Return (event, transcript) from a Deepgram Flux message."""

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

            # Completed user turns waiting for the AI worker
            turn_queue: asyncio.Queue[str] = (
                asyncio.Queue()
            )

            # Set while the AI thinks / streams / speaks so the
            # mic echo cannot trigger a new turn (barge-in hook:
            # clear this to accept interruptions later).
            speaking = asyncio.Event()

            async def mic_to_stt():
                """Browser microphone -> Deepgram, never blocked by Groq/TTS."""
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
                """Deepgram Flux events -> live transcripts + turn queue."""
                async for message in stt:
                    event, transcript = (
                        parse_flux_message(message)
                    )

                    if not transcript:
                        continue

                    print("Flux:", event, "-", transcript)

                    if event == "EndOfTurn":
                        # Completed user turn only
                        if speaking.is_set():
                            continue

                        await websocket.send_text(
                            json.dumps({
                                "type": "transcript",
                                "transcript": transcript,
                                "is_final": True,
                            })
                        )

                        await turn_queue.put(transcript)
                        continue

                    if event in PARTIAL_EVENTS:
                        # Live transcript, Groq is NOT called
                        if speaking.is_set():
                            continue

                        await websocket.send_text(
                            json.dumps({
                                "type": "transcript",
                                "transcript": transcript,
                                "is_final": False,
                            })
                        )

                # STT socket ended on its own
                raise RuntimeError(
                    "Deepgram STT connection closed"
                )

            async def handle_turn(transcript: str):
                speaking.set()

                state = {
                    "started_at": None,
                    "bytes": 0,
                }

                async def forward(chunk: bytes):
                    # First chunk onward: stream straight to the browser
                    if state["started_at"] is None:
                        state["started_at"] = (
                            time.monotonic()
                        )

                    state["bytes"] += len(chunk)

                    await websocket.send_bytes(chunk)

                try:
                    await websocket.send_text(
                        json.dumps({
                            "type": "ai_thinking"
                        })
                    )

                    answer = await generate_response(
                        transcript
                    )

                    await websocket.send_text(
                        json.dumps({
                            "type": "ai_response",
                            "response": answer,
                        })
                    )

                    await tts.speak(answer, forward)

                    # Keep the echo guard up for as long as the
                    # browser is still playing the audio.
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

                finally:
                    with contextlib.suppress(Exception):
                        await websocket.send_text(
                            json.dumps({
                                "type": "ai_done"
                            })
                        )

                    speaking.clear()

            async def turn_worker():
                while True:
                    transcript = (
                        await turn_queue.get()
                    )

                    try:
                        await handle_turn(transcript)

                    except asyncio.CancelledError:
                        raise

                    except Exception as error:
                        print("Turn error:", error)

                        speaking.clear()

            tasks = [
                asyncio.create_task(mic_to_stt()),
                asyncio.create_task(stt_to_queue()),
                asyncio.create_task(turn_worker()),
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
                        error, WebSocketDisconnect
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
        print("Browser disconnected")

    except Exception as error:
        print("Voice error:", error)
