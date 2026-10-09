from services.embeddings import generate_embeddings

vectors = generate_embeddings([
    "Our business is open from 9 AM to 6 PM.",
    "We provide dental cleaning services.",
])

print("Number of vectors:", len(vectors))
print("Dimensions:", len(vectors[0]))

assert len(vectors) == 2
assert all(len(vector) == 768 for vector in vectors)

print("Gemini embedding test passed.")