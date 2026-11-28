"""
Browser-free check of the Sarvam integration.

Run from the backend folder:

    python Test/test_sarvam.py

1. TTS  : synthesises a sentence and saves Test/tts_test.wav (play it).
2. STT  : feeds that audio back into Sarvam STT with a fixed language.
3. STT  : same, with language_code="unknown" (auto-detect).

Whichever step fails tells you which part is broken.
"""

import array
import asyncio
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import services.speech_to_text as stt_module
from services.speech_to_text import STT_SAMPLE_RATE, SarvamSTT
from services.text_to_speech import SAMPLE_RATE, generate_speech_pcm

TEXT = "Hello, I would like to know the visiting hours of the hospital."
CHUNK = 3200  # 100 ms of 16 kHz PCM16, same as the browser sends


def resample(pcm: bytes, src_rate: int, dst_rate: int) -> bytes:
    src = array.array("h")
    src.frombytes(pcm)

    ratio = src_rate / dst_rate
    out = array.array("h")

    for i in range(int(len(src) / ratio)):
        pos = i * ratio
        i0 = int(pos)
        frac = pos - i0
        s0 = src[i0]
        s1 = src[min(i0 + 1, len(src) - 1)]
        out.append(int(s0 + (s1 - s0) * frac))

    return out.tobytes()


async def test_tts() -> bytes | None:
    print("\n=== 1. TTS ===")

    try:
        pcm = await generate_speech_pcm(TEXT, "en-IN")
    except Exception as exc:
        print("TTS FAILED:", repr(exc))
        return None

    seconds = len(pcm) / (SAMPLE_RATE * 2)
    print(f"OK: {len(pcm)} bytes = {seconds:.1f}s of audio")

    if not pcm:
        print("TTS returned no audio.")
        return None

    path = Path(__file__).with_name("tts_test.wav")

    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(SAMPLE_RATE)
        wav.writeframes(pcm)

    print("Saved", path, "- play it to check the voice and speed")

    return pcm


async def test_stt(pcm16: bytes, language_code: str, mode: str) -> None:
    print(f"\n=== STT language_code={language_code!r} mode={mode!r} ===")

    stt_module.DEBUG_RAW = True

    try:
        async with SarvamSTT(language_code=language_code, mode=mode) as stt:

            async def sender():
                for i in range(0, len(pcm16), CHUNK):
                    await stt.send_pcm(pcm16[i : i + CHUNK])
                    await asyncio.sleep(0.05)

                # Trailing silence so the VAD detects end of speech.
                for _ in range(30):
                    await stt.send_pcm(bytes(CHUNK))
                    await asyncio.sleep(0.05)

            send_task = asyncio.create_task(sender())

            try:
                async with asyncio.timeout(25):
                    async for event in stt.events():
                        print("EVENT:", event)

                        if event["type"] in ("transcript", "closed", "error"):
                            break

            except TimeoutError:
                print("TIMEOUT: Sarvam sent no transcript within 25s")

            finally:
                send_task.cancel()

    except Exception as exc:
        print("STT FAILED to connect or send:", repr(exc))


async def main():
    pcm24 = await test_tts()

    if pcm24 is None:
        print("\nFix TTS first (check SARVAM_API_KEY, model, speaker).")
        return

    pcm16 = resample(pcm24, SAMPLE_RATE, STT_SAMPLE_RATE)

    await test_stt(pcm16, "en-IN", "transcribe")
    await test_stt(pcm16, "unknown", "codemix")


if __name__ == "__main__":
    asyncio.run(main())