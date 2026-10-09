import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from services.vector_store import client, COLLECTION_NAME

print("Connected:", client.get_collections())
print("Collection:", client.get_collection(COLLECTION_NAME))
print("Qdrant Cloud connection successful.")