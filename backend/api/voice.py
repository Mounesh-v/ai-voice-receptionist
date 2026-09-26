import asyncio
import json

import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from config import DEEPGRAM_API_KEY

router = APIRouter()


@router.websocket("/voice")
async def voice(websocket: WebSocket):

    await websocket.accept()

    print("Browser WebSocket connected")

    deepgram_url = (
        "wss://api.deepgram.com/v2/listen"
        "?model=flux-general-en"
    )

    try:
        async with websockets.connect(
            deepgram_url,
            additional_headers={
                "Authorization": f"Token {DEEPGRAM_API_KEY}"
            },
        ) as deepgram:

            print("Connected to Deepgram")

            async def send_audio():
                try:
                    while True:
                        audio_chunk = await websocket.receive_bytes()

                        print(
                            "Received audio:",
                            len(audio_chunk),
                            "bytes"
                        )

                        await deepgram.send(audio_chunk)

                except WebSocketDisconnect:
                    print("Browser disconnected")

            async def receive_transcripts():
                try:
                    async for message in deepgram:

                        data = json.loads(message)

                        print("Deepgram:", data)

                        await websocket.send_text(
                            json.dumps(data)
                        )

                except websockets.exceptions.ConnectionClosed:
                    print("Deepgram disconnected")

            await asyncio.gather(
                send_audio(),
                receive_transcripts(),
            )

    except Exception as error:
        print("Voice error:", error)