"""
Controlled Admin Creation CLI Script
Usage:
    python scripts/create_admin.py
    python scripts/create_admin.py --name "Hospital Admin" --email "admin@hospital.com" --password "Admin@123"
"""
import sys
import os
import argparse
import getpass

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from database.mongodb import get_users_collection
from services.security import hash_password
from models.user import UserRole


def create_admin(name: str, email: str, password: str):
    email = email.strip().lower()
    name = name.strip()
    if len(name) < 2:
        print("[ERROR] Name must be at least 2 characters.")
        return False
    if len(password) < 6:
        print("[ERROR] Password must be at least 6 characters.")
        return False

    users = get_users_collection()
    if users is None:
        print("[ERROR] Could not connect to MongoDB.")
        return False

    existing = users.find_one({"email": email})
    if existing:
        if existing.get("role") == UserRole.ADMIN.value:
            print(f"[INFO] User with email '{email}' already exists and is already an ADMIN.")
            return True
        else:
            # Promote existing user to admin
            users.update_one({"_id": existing["_id"]}, {"$set": {"role": UserRole.ADMIN.value}})
            print(f"[SUCCESS] User '{email}' promoted to ADMIN successfully!")
            return True

    hashed_pw = hash_password(password)
    admin_doc = {
        "name": name,
        "email": email,
        "password_hash": hashed_pw,
        "role": UserRole.ADMIN.value,
    }
    result = users.insert_one(admin_doc)
    print(f"[SUCCESS] Admin account created successfully! User ID: {result.inserted_id}")
    return True


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create a controlled Hospital Admin account.")
    parser.add_argument("--name", help="Admin Full Name")
    parser.add_argument("--email", help="Admin Email")
    parser.add_argument("--password", help="Admin Password")

    args = parser.parse_args()

    name = args.name or input("Enter Admin Full Name: ")
    email = args.email or input("Enter Admin Email: ")
    password = args.password
    if not password:
        password = getpass.getpass("Enter Admin Password (min 6 characters): ")

    create_admin(name, email, password)
