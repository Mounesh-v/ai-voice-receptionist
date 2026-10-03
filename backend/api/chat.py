from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.chat import generate_response

router = APIRouter()


class ChatRequest(BaseModel):
    transcript: str = Field(
        ...,
        min_length=1,
        description="The caller's message"
    )


class ChatResponse(BaseModel):
    response: str


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        answer = await generate_response(request.transcript)

        return ChatResponse(response=answer)

    except Exception as error:
        print("Chat API error:", error)
        raise HTTPException(
            status_code=500,
            detail=str(error)
        )