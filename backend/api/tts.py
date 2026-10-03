from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, Field

from services.text_to_speech import generate_speech


router = APIRouter()


class TTSRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        description="Text to convert into speech"
    )


@router.post("/tts")
async def text_to_speech(request: TTSRequest):

    try:
        audio = await generate_speech(request.text)

        return Response(
            content=audio,
            media_type="audio/wav",
        )

    except Exception as error:
        print("TTS error:", repr(error))

        raise HTTPException(
            status_code=502,
            detail="Text-to-speech service is unavailable."
        )