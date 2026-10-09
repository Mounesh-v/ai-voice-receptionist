from google import genai
from google.genai import types

from config import GEMINI_API_KEY

MODEL_NAME = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 768

client = genai.Client(api_key=GEMINI_API_KEY)


def generate_embeddings(
    texts: list[str],
) -> list[list[float]]:
    if not texts:
        return []

    vectors = []

    for text in texts:
        result = client.models.embed_content(
            model=MODEL_NAME,
            contents=types.Content(
                parts=[
                    types.Part.from_text(text=text)
                ]
            ),
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )

        if not result.embeddings or len(result.embeddings) != 1:
            raise RuntimeError(
                "Gemini did not return exactly one embedding "
                "for the input text."
            )

        vector = result.embeddings[0].values

        if vector is None or len(vector) != EMBEDDING_DIMENSIONS:
            raise RuntimeError(
                "Gemini returned an unexpected embedding dimension."
            )

        vectors.append(vector)

    return vectors