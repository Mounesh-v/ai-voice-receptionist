import asyncio
import contextlib
import io
import wave

from deepgram import AsyncDeepgramClient
from deepgram.speak.v1.types import SpeakV1Text

from config import DEEPGRAM_API_KEY


SAMPLE_RATE = 24000

# Deepgram TTS answers every Flush with a Flushed message.
# The timeout only protects against a silent/stuck socket.
FLUSH_TIMEOUT = 20

deepgram = AsyncDeepgramClient(api_key=DEEPGRAM_API_KEY)


class StreamingSpeech:
    """
    One Deepgram TTS WebSocket kept alive for the whole conversation.

    speak() forwards every audio chunk through the callback as soon as
    Deepgram produces it. Nothing is buffered, nothing is written to disk.
    """

    def __init__(self):
        self._manager = None
        self._connection = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()

    async def _open(self):
        self._manager = deepgram.speak.v1.connect(
            model="aura-2-asteria-en",
            encoding="linear16",
            sample_rate=SAMPLE_RATE,
        )

        self._connection = (
            await self._manager.__aenter__()
        )

    async def _ensure_open(self):
        if self._connection is None:
            await self._open()

    async def _reset(self):
        await self.close()

    async def speak(self, text: str, on_chunk) -> None:
        """
        Stream `text` to Deepgram and forward every PCM chunk.

        on_chunk: async callable receiving raw linear16 bytes.
        """
        forwarded = False

        async def guarded(chunk: bytes):
            nonlocal forwarded
            forwarded = True
            await on_chunk(chunk)

        try:
            await self._stream(text, guarded)
            return

        except Exception:
            # Always drop the broken socket so the next
            # turn starts from a clean connection.
            await self._reset()

            # Only retry when nothing reached the browser yet,
            # so the listener never hears a chunk twice.
            if forwarded:
                raise

        await self._stream(text, guarded)

    async def _stream(self, text: str, on_chunk) -> None:
        await self._ensure_open()

        connection = self._connection

        await connection.send_text(SpeakV1Text(text=text))
        await connection.send_flush()

        while True:
            try:
                message = await asyncio.wait_for(
                    connection.recv(),
                    timeout=FLUSH_TIMEOUT,
                )

            except TimeoutError:
                print("TTS: no Flushed received, moving on")
                return

            if isinstance(message, bytes):
                # Raw linear16 @ 24kHz - forward immediately
                await on_chunk(message)
                continue

            if getattr(message, "type", None) == "Flushed":
                return

            # Metadata / Warning: nothing to play

    async def close(self):
        connection = self._connection
        manager = self._manager

        self._connection = None
        self._manager = None

        if connection is None:
            return

        with contextlib.suppress(Exception):
            await connection.send_close()

        if manager is not None:
            with contextlib.suppress(Exception):
                await manager.__aexit__(None, None, None)


async def generate_speech_pcm(text: str) -> bytes:
    """Return raw linear16 mono PCM at SAMPLE_RATE (no header)."""

    audio_chunks = []

    async with asyncio.timeout(30):
        async with deepgram.speak.v1.connect(
            model="aura-2-asteria-en",
            encoding="linear16",
            sample_rate=SAMPLE_RATE,
        ) as connection:

            await connection.send_text(
                SpeakV1Text(text=text)
            )

            await connection.send_flush()

            await connection.send_close()

            async for message in connection:

                if isinstance(message, bytes):
                    audio_chunks.append(message)

    return b"".join(audio_chunks)


async def generate_speech(text: str) -> bytes:
    """Return a WAV file for HTTP clients."""

    pcm = await generate_speech_pcm(text)

    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm)

    return buffer.getvalue()
