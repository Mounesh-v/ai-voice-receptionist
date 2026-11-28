"""Live WebSocket e2e test against the running server (:8000).

Covers the full pipeline with the LangGraph orchestrator:

    register/login -> WS connect (cookie auth)
      -> Sarvam TTS synthesizes an utterance
      -> resampled to 16 kHz PCM16 and streamed as microphone audio
      -> transcript -> ai_thinking -> ai_response -> TTS PCM -> ai_done
      -> second utterance must recall the first (conversation memory)

Run (server must be up):  python Test/test_voice_e2e.py
"""

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import asyncio
import json
import struct
import time
import uuid

import httpx
import websockets

from services.text_to_speech import generate_speech_pcm

BASE_HTTP = "http://localhost:8000"
BASE_WS = "ws://localhost:8000/api/voice?lang=en-IN"

MIC_RATE = 16000
FRAME_BYTES = 3200  # 100 ms at 16 kHz
TTS_RATE = 24000


def resample_pcm16(pcm: bytes, src_rate: int, dst_rate: int) -> bytes:
    """Linear-interpolation resample of raw mono PCM16."""
    if src_rate == dst_rate or not pcm:
        return pcm

    count = len(pcm) // 2
    samples = struct.unpack(f"<{count}h", pcm)
    ratio = src_rate / dst_rate
    out_count = int(count / ratio)
    out = []

    for i in range(out_count):
        pos = i * ratio
        idx = int(pos)
        frac = pos - idx
        if idx + 1 < count:
            value = samples[idx] * (1.0 - frac) + samples[idx + 1] * frac
        else:
            value = samples[idx]
        out.append(int(max(-32767, min(32767, value))))

    return struct.pack(f"<{len(out)}h", *out)


def silence(seconds: float) -> bytes:
    return b"\x00" * int(MIC_RATE * 2 * seconds)


async def make_utterance(text: str) -> bytes:
    """Synthesize speech and return 16 kHz PCM16 with silence padding."""
    pcm24 = await generate_speech_pcm(text, "en-IN")
    pcm16 = resample_pcm16(pcm24, TTS_RATE, MIC_RATE)
    return silence(0.4) + pcm16 + silence(1.5)


async def run_utterance(ws, pcm: bytes, timeout: float = 90.0) -> list:
    """Stream one utterance and collect messages until ai_done.

    The sender stops as soon as the first transcript arrives (the
    caller "stopped talking"), so leftover frames cannot trigger a
    spurious barge-in speech_start while the AI turn is running.
    """
    import contextlib

    messages: list = []
    stop_sending = asyncio.Event()

    async def receiver():
        deadline = time.monotonic() + timeout
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(f"turn timed out; got: {messages!r}")

            raw = await asyncio.wait_for(ws.recv(), timeout=remaining)

            if isinstance(raw, (bytes, bytearray)):
                messages.append({"type": "__binary__", "bytes": len(raw)})
                continue

            data = json.loads(raw)
            messages.append(data)

            kind = data.get("type")
            if kind == "transcript":
                stop_sending.set()
            if kind in ("ai_done", "error", "fallback"):
                return

    async def sender():
        for offset in range(0, len(pcm), FRAME_BYTES):
            if stop_sending.is_set():
                print("sender stopped at transcript")
                return
            await ws.send(pcm[offset:offset + FRAME_BYTES])
            await asyncio.sleep(0.01)

    recv_task = asyncio.create_task(receiver())
    send_task = asyncio.create_task(sender())

    try:
        await recv_task
    finally:
        send_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await send_task

    return messages


def assert_turn_shape(messages: list, label: str) -> dict:
    types = [m.get("type") for m in messages]

    assert "transcript" in types, f"{label}: no transcript: {types}"
    assert "ai_thinking" in types, f"{label}: no ai_thinking: {types}"
    assert "ai_response" in types, f"{label}: no ai_response: {types}"
    assert types[-1] == "ai_done", f"{label}: last msg not ai_done: {types}"

    # Ordering: transcript < ai_thinking < ai_response < ai_done
    assert (
        types.index("transcript")
        < types.index("ai_thinking")
        < types.index("ai_response")
        < types.index("ai_done")
    ), f"{label}: bad ordering: {types}"

    # Binary TTS audio must have arrived after ai_response.
    binary_after = [
        i for i, m in enumerate(messages)
        if m.get("type") == "__binary__"
        and i > types.index("ai_response")
    ]
    assert binary_after, f"{label}: no TTS PCM frames after ai_response"

    response_msg = next(
        m for m in messages if m.get("type") == "ai_response"
    )
    assert response_msg.get("response"), f"{label}: empty response"
    assert response_msg.get("language"), f"{label}: missing language"

    transcript_msg = next(
        m for m in messages if m.get("type") == "transcript"
    )
    assert transcript_msg.get("transcript"), f"{label}: empty transcript"

    return {
        "transcript": transcript_msg["transcript"],
        "response": response_msg["response"],
        "language": response_msg["language"],
        "binary_frames": len(binary_after),
    }


async def main() -> None:
    email = f"e2e-{uuid.uuid4().hex[:10]}@example.com"
    password = "E2eTest!12345"

    async with httpx.AsyncClient(base_url=BASE_HTTP, timeout=30) as client:
        register = await client.post(
            "/api/auth/register",
            json={
                "name": "E2E Tester",
                "email": email,
                "password": password,
            },
        )
        assert register.status_code == 201, register.text

        login = await client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        assert login.status_code == 200, login.text
        session_id = login.json().get("session_id")
        assert session_id, login.text

    print(f"auth OK (user {email})")

    print("synthesizing utterance 1...")
    utt1 = await make_utterance(
        "My name is Samuel and I am allergic to penicillin."
    )
    print("synthesizing utterance 2...")
    utt2 = await make_utterance(
        "What is my name and what am I allergic to?"
    )

    try:
        connect_kwargs = {
            "additional_headers": {
                "Cookie": f"session_id={session_id}",
            },
            "open_timeout": 15,
        }
        async with websockets.connect(BASE_WS, **connect_kwargs) as ws:
            print("websocket connected")
            await asyncio.sleep(1.0)

            # ---------------- Turn 1 ----------------
            turn1 = await run_utterance(ws, utt1, timeout=90)
            shape1 = assert_turn_shape(turn1, "turn1")
            print(
                f"turn1 transcript: {shape1['transcript']!r}\n"
                f"turn1 response:   {shape1['response'][:120]!r}\n"
                f"turn1 language:   {shape1['language']}"
                f" ({shape1['binary_frames']} TTS frames)"
            )
            assert shape1["language"] == "en-IN"

            await asyncio.sleep(1.5)

            # ---------------- Turn 2 (memory) ----------------
            turn2 = await run_utterance(ws, utt2, timeout=90)
            shape2 = assert_turn_shape(turn2, "turn2")
            print(
                f"turn2 transcript: {shape2['transcript']!r}\n"
                f"turn2 response:   {shape2['response'][:160]!r}"
            )

            lowered = shape2["response"].lower()
            assert "penicillin" in lowered, (
                f"allergy not recalled over live WS: "
                f"{shape2['response']!r}"
            )
            assert (
                "samuel" in lowered or "sam " in lowered
                or "your name is sam" in lowered
            ), f"name not recalled over live WS: {shape2['response']!r}"

    except websockets.exceptions.InvalidStatus as error:
        raise AssertionError(
            f"WS rejected (auth/session problem): {error}"
        ) from error

    print("ALL OK (live WS e2e)")


if __name__ == "__main__":
    asyncio.run(main())
