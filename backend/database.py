from pymongo import MongoClient
from config import MONGO_URI

client = MongoClient(MONGO_URI)

db = client["ai_voice_receptionist"]

users_collection = db["users"]