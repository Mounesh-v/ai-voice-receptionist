from faster_whisper import WhisperModel


model = WhisperModel(
    "small",
    device="cpu",
    compute_type="int8"
)


async def transcribe_audio(
    audio_data: bytes,
    content_type: str | None
) -> str:

    # We'll handle the incoming webm bytes here.

    return "test"