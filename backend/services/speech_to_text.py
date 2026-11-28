"""
Sarvam streaming speech-to-text.

Replaces the old faster-whisper stub. Audio in: raw 16 kHz mono PCM16
(little-endian) frames from the browser. Events out, normalised so
api/voice.py does not depend on Sarvam's message shapes:

    {"type": "speech_start"}
    {"type": "speech_end"}
    {"type": "transcript", "text": "...", "language": "hi-IN" | None}
    {"type": "error", "message": "..."}
    {"type": "closed", "message": "..."}

Usage in api/voice.py:

    async with SarvamSTT() as stt:
        # mic task
        async for pcm in websocket.iter_bytes():
            await stt.send_pcm(pcm)

        # event task
        async for event in stt.events():
            ...

Note: the generally available endpoint returns the transcript after the
speaker pauses (no word-by-word partials).
"""

import base64
import contextlib
import struct

from sarvamai import AsyncSarvamAI

from config import SARVAM_API_KEY, SARVAM_STT_MODEL


STT_SAMPLE_RATE = 16000

# Set True once to print raw Sarvam messages while debugging.
DEBUG_RAW = False

sarvam = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)


def pcm_to_wav(pcm: bytes, rate: int = STT_SAMPLE_RATE) -> bytes:
    """Wrap raw PCM16 mono in a 44-byte WAV header
    (the SDK sends audio with encoding="audio/wav")."""
    return (
        b"RIFF"
        + struct.pack("<I", 36 + len(pcm))
        + b"WAVEfmt "
        + struct.pack("<IHHIIHH", 16, 1, 1, rate, rate * 2, 2, 16)
        + b"data"
        + struct.pack("<I", len(pcm))
        + pcm
    )


class SarvamSTT:
    def __init__(
        self,
        language_code: str = "unknown",   # "unknown" = auto-detect; else e.g. "hi-IN"
        mode: str = "codemix",            # "transcribe" | "codemix" | "translit" ...
    ):
        self.language_code = language_code
        self.mode = mode

        # Sarvam reports language_code as null while detection is still in
        # progress, so remember the last real value for the TTS voice.
        self.last_language = None if language_code == "unknown" else language_code

        self._manager = None
        self._ws = None

    async def __aenter__(self):
        self._manager = sarvam.speech_to_text_streaming.connect(
            model=SARVAM_STT_MODEL,
            mode=self.mode,
            language_code=self.language_code,
            sample_rate=STT_SAMPLE_RATE,
            high_vad_sensitivity=True,   # snappier end-of-speech for conversation
            vad_signals=True,            # START_SPEECH / END_SPEECH events -> barge-in
        )

        self._ws = await self._manager.__aenter__()

        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()

    async def send_pcm(self, pcm: bytes) -> None:
        if not pcm or self._ws is None:
            return

        await self._ws.transcribe(
            audio=base64.b64encode(pcm_to_wav(pcm)).decode("ascii"),
            encoding="audio/wav",
            sample_rate=STT_SAMPLE_RATE,   # must match the connect() sample_rate
        )

    async def events(self):
        """Async generator of normalised events (see module docstring)."""
        while self._ws is not None:
            try:
                message = await self._ws.recv()

            except Exception as exc:
                yield {"type": "closed", "message": str(exc)}
                return

            if DEBUG_RAW:
                print("SARVAM STT RAW:", repr(message))

            for event in self._normalise(message):
                yield event

    def _normalise(self, message):
        kind = getattr(message, "type", None)
        data = getattr(message, "data", None)

        if kind == "events":
            signal = str(getattr(data, "signal_type", "")).upper()

            if signal == "START_SPEECH":
                yield {"type": "speech_start"}
            elif signal == "END_SPEECH":
                yield {"type": "speech_end"}

        elif kind == "data":
            text = (getattr(data, "transcript", "") or "").strip()

            if text:
                detected = getattr(data, "language_code", None)

                if detected:
                    self.last_language = detected

                yield {
                    "type": "transcript",
                    "text": text,
                    "language": detected or self.last_language,
                }

        elif kind == "error":
            yield {
                "type": "error",
                "message": str(getattr(data, "error", None) or data),
            }

    async def close(self):
        manager = self._manager

        self._ws = None
        self._manager = None

        if manager is not None:
            with contextlib.suppress(Exception):
                await manager.__aexit__(None, None, None)