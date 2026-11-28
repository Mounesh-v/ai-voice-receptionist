import asyncio
import base64
import contextlib
import io
import re
import wave

from sarvamai import AsyncSarvamAI, AudioOutput, EventResponse

from config import (
    SARVAM_API_KEY,
    SARVAM_TTS_MODEL,
    SARVAM_TTS_SPEAKER,
)


# Output rate requested from Sarvam. Must match TTS_SAMPLE_RATE in
# VoiceRecorder.jsx, otherwise playback is pitch/speed shifted.
SAMPLE_RATE = 24000

DEFAULT_LANGUAGE = "en-IN"

# Sarvam sends a "final" event after flush (send_completion_event=True).
# The timeout only protects against a silent/stuck socket.
FLUSH_TIMEOUT = 20

# Sarvam recommends < 500 chars per convert() call for streaming.
MAX_CONVERT_CHARS = 450

sarvam = AsyncSarvamAI(api_subscription_key=SARVAM_API_KEY)

# Sentence ends for English and Indic scripts (danda, double danda).
_SENTENCE_END = re.compile(r"(?<=[.!?\u0964\u0965])\s+")


def _split_text(text: str) -> list[str]:
    """Short convert() calls give low first-audio latency, and a barge-in
    throws away less already-generated audio."""
    pieces = []

    for sentence in _SENTENCE_END.split(text.strip()):
        sentence = sentence.strip()

        while len(sentence) > MAX_CONVERT_CHARS:
            cut = sentence.rfind(" ", 0, MAX_CONVERT_CHARS)
            cut = cut if cut > 0 else MAX_CONVERT_CHARS

            pieces.append(sentence[:cut].strip())
            sentence = sentence[cut:].strip()

        if sentence:
            pieces.append(sentence)

    return pieces


def _strip_wav_header(chunk: bytes) -> bytes:
    # Defensive: if a chunk carries a WAV header, drop it so only raw
    # PCM reaches the browser player.
    if chunk[:4] == b"RIFF" and len(chunk) > 44:
        return chunk[44:]

    return chunk


class StreamingSpeech:
    """
    One Sarvam TTS WebSocket kept alive between turns.

    Sarvam has no in-band cancel. On barge-in, cancel the task running
    speak() (it closes the socket itself) or call close(). The next
    speak() transparently opens a fresh socket.

    Voice and language are fixed per connection, so a language change
    reconnects automatically.
    """

    def __init__(self, language_code: str = DEFAULT_LANGUAGE):
        self.language_code = language_code

        self._manager = None
        self._connection = None
        self._connected_language = None

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.close()

    async def _open(self, language_code: str):
        self._manager = sarvam.text_to_speech_streaming.connect(
            model=SARVAM_TTS_MODEL,
            send_completion_event=True,
        )

        self._connection = await self._manager.__aenter__()

        try:
            # configure() must be the first message after connecting.
            # If output_audio_codec is omitted Sarvam streams MP3, which the
            # browser's raw-PCM player cannot play.
            await self._connection.configure(
                target_language_code=language_code,
                speaker=SARVAM_TTS_SPEAKER,
                output_audio_codec="linear16",
                speech_sample_rate=SAMPLE_RATE,
            )

        except Exception:
            await self.close()
            raise

        self._connected_language = language_code

    async def _ensure_open(self, language_code: str):
        if (
            self._connection is not None
            and self._connected_language != language_code
        ):
            await self.close()

        if self._connection is None:
            await self._open(language_code)

    async def _reset(self):
        await self.close()

    async def speak(
        self,
        text: str,
        on_chunk,
        language_code: str | None = None,
    ) -> None:
        """
        Stream `text` to Sarvam and forward every PCM chunk.

        on_chunk: async callable receiving raw linear16 bytes @ 24kHz.
        language_code: BCP-47 code such as "hi-IN", "ta-IN", "en-IN".
        """
        language = language_code or self.language_code or DEFAULT_LANGUAGE

        forwarded = False

        async def guarded(chunk: bytes):
            nonlocal forwarded
            forwarded = True
            await on_chunk(chunk)

        try:
            await self._stream(text, guarded, language)
            return

        except asyncio.CancelledError:
            # Barge-in. Un-played audio is still queued on the socket,
            # so drop it or it would leak into the next turn.
            with contextlib.suppress(Exception):
                await asyncio.shield(self._reset())

            raise

        except Exception as exc:
            print(f"TTS error: {exc!r}")

            # Always drop the broken socket so the next
            # turn starts from a clean connection.
            await self._reset()

            # Only retry when nothing reached the browser yet,
            # so the listener never hears a chunk twice.
            if forwarded:
                raise

        await self._stream(text, guarded, language)

    async def _stream(self, text: str, on_chunk, language: str) -> None:
        pieces = _split_text(text)

        # Nothing to say: never flush an empty buffer, it would just
        # sit until the timeout.
        if not pieces:
            return

        await self._ensure_open(language)

        connection = self._connection

        for piece in pieces:
            await connection.convert(piece)

        await connection.flush()

        while True:
            try:
                message = await asyncio.wait_for(
                    connection.recv(),
                    timeout=FLUSH_TIMEOUT,
                )

            except asyncio.TimeoutError:
                print("TTS: no completion event received, resetting socket")

                # Late audio from this turn would otherwise
                # bleed into the next one.
                await self._reset()
                return

            if isinstance(message, AudioOutput):
                pcm = _strip_wav_header(base64.b64decode(message.data.audio))

                if pcm:
                    await on_chunk(pcm)

                continue

            if isinstance(message, EventResponse):
                if getattr(message.data, "event_type", None) == "final":
                    return

                continue

            if getattr(message, "type", None) == "error":
                # Surface Sarvam errors now instead of waiting for the timeout.
                raise RuntimeError(
                    f"Sarvam TTS error: {getattr(message, 'data', message)}"
                )

            # Anything else (pings etc.): nothing to play.

    async def close(self):
        manager = self._manager

        self._connection = None
        self._manager = None
        self._connected_language = None

        if manager is not None:
            with contextlib.suppress(Exception):
                await manager.__aexit__(None, None, None)


async def generate_speech_pcm(
    text: str,
    language_code: str = DEFAULT_LANGUAGE,
) -> bytes:
    """Return raw linear16 mono PCM at SAMPLE_RATE (no header)."""

    audio_chunks = []

    async def collect(chunk: bytes):
        audio_chunks.append(chunk)

    async with asyncio.timeout(30):
        async with StreamingSpeech(language_code) as speech:
            await speech.speak(text, collect, language_code)

    return b"".join(audio_chunks)


async def generate_speech(
    text: str,
    language_code: str = DEFAULT_LANGUAGE,
) -> bytes:
    """Return a WAV file for HTTP clients."""

    pcm = await generate_speech_pcm(text, language_code)

    buffer = io.BytesIO()

    with wave.open(buffer, "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm)

    return buffer.getvalue()