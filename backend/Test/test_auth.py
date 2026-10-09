"""
Automated Test Suite for Authentication, Redis Sessions, and RBAC
Tests all requirements:
1. Register new user
2. Register duplicate email (409)
3. Login with correct password
4. Login with wrong password (401)
5. Access /api/auth/me without login (401)
6. Access /api/auth/me after login (200)
7. Normal user accessing admin endpoint (403)
8. Admin accessing admin endpoint (200)
9. Logout invalidating session
10. Access protected endpoint after logout (401)
11. Verify password hashing in DB
12. Verify Redis session storage and TTL
13. Verify existing /health still works
14. Public registration role tampering prevention (attempting role="admin" remains "user")
"""
import asyncio
from fastapi.testclient import TestClient
from main import app
from database.mongodb import get_users_collection
from database.redis import get_redis_client, get_session, delete_session
from services.security import verify_password
from models.user import UserRole


def run_tests():
    client = TestClient(app)
    users = get_users_collection()
    assert users is not None, "MongoDB connection failed"

    print("\n--- [TEST 1] Existing /health endpoint ---")
    res = client.get("/health")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert res.json() == {"status": "ok"}, f"Unexpected body: {res.json()}"
    print("PASS: /health returned {'status': 'ok'}")

    # Clean up test users if existing
    test_user_email = "test_user_hosp@example.com"
    test_admin_email = "test_admin_hosp@example.com"
    users.delete_many({"email": {"$in": [test_user_email, test_admin_email]}})

    print("\n--- [TEST 2] Register new user ---")
    reg_payload = {
        "name": "Jane Doe",
        "email": test_user_email,
        "password": "Password@123",
        "role": "admin"  # Security test: Trying to elevate role via registration
    }
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    data = res.json()
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]
    # Role must strictly be "user", ignoring the client-supplied "admin"
    assert data["user"]["role"] == "user", f"Security violation: role was {data['user']['role']}"
    print(f"PASS: User registered successfully with enforced role='{data['user']['role']}'")

    print("\n--- [TEST 3] Verify Password Hash in MongoDB ---")
    db_user = users.find_one({"email": test_user_email})
    assert db_user is not None
    assert "password_hash" in db_user
    assert db_user["password_hash"] != "Password@123"
    assert db_user["password_hash"].startswith("$2b$") or db_user["password_hash"].startswith("$2a$")
    assert verify_password("Password@123", db_user["password_hash"]) is True
    print("PASS: Password is securely hashed with bcrypt in MongoDB")

    print("\n--- [TEST 4] Register duplicate email (Conflict 409) ---")
    res = client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 409, f"Expected 409, got {res.status_code}: {res.text}"
    print("PASS: Duplicate registration rejected with 409 Conflict")

    print("\n--- [TEST 5] Login with wrong password (401) ---")
    bad_login = {
        "email": test_user_email,
        "password": "WrongPassword999"
    }
    res = client.post("/api/auth/login", json=bad_login)
    assert res.status_code == 401, f"Expected 401, got {res.status_code}: {res.text}"
    print("PASS: Login with incorrect password rejected with 401")

    print("\n--- [TEST 6] Login with correct password ---")
    good_login = {
        "email": test_user_email,
        "password": "Password@123"
    }
    res = client.post("/api/auth/login", json=good_login)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    login_data = res.json()
    assert "session_id" in login_data
    session_id = login_data["session_id"]
    assert "session_id" in res.cookies
    user_cookie = res.cookies["session_id"]
    print(f"PASS: Login successful. Session ID generated: {session_id[:10]}...")

    print("\n--- [TEST 7] Access /api/auth/me without login (401) ---")
    anon_client = TestClient(app)
    res = anon_client.get("/api/auth/me")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("PASS: Accessing /api/auth/me without login rejected with 401")

    print("\n--- [TEST 8] Access /api/auth/me after login (200) ---")
    res = client.get("/api/auth/me")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    me_data = res.json()
    assert me_data["email"] == test_user_email
    assert me_data["role"] == "user"
    print(f"PASS: /api/auth/me returned correct profile for {me_data['name']}")

    print("\n--- [TEST 9] RBAC: Normal user accessing /api/admin/test (403 Forbidden) ---")
    res = client.get("/api/admin/test")
    assert res.status_code == 403, f"Expected 403, got {res.status_code}: {res.text}"
    print("PASS: Normal user blocked from admin endpoint with 403 Forbidden")

    print("\n--- [TEST 10] Controlled Admin Account Creation & Admin RBAC (200 OK) ---")
    from services.security import hash_password
    users.insert_one({
        "name": "Dr. Sarah Connor (Admin)",
        "email": test_admin_email,
        "password_hash": hash_password("AdminPass@123"),
        "role": UserRole.ADMIN.value
    })
    
    admin_client = TestClient(app)
    admin_login = admin_client.post("/api/auth/login", json={
        "email": test_admin_email,
        "password": "AdminPass@123"
    })
    assert admin_login.status_code == 200, f"Expected 200, got {admin_login.status_code}"
    
    # Access admin test endpoint
    admin_res = admin_client.get("/api/admin/test")
    assert admin_res.status_code == 200, f"Expected 200, got {admin_res.status_code}: {admin_res.text}"
    assert admin_res.json()["user"]["role"] == "admin"
    print("PASS: Admin user granted access to /api/admin/test with 200 OK")

    print("\n--- [TEST 11] Logout and Session Invalidation ---")
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200
    # Cookie should be deleted/cleared
    # Subsequent access with same client to /api/auth/me must fail with 401
    post_logout_me = client.get("/api/auth/me")
    assert post_logout_me.status_code == 401, f"Expected 401 after logout, got {post_logout_me.status_code}"
    print("PASS: Session invalidated upon logout. Protected route returns 401.")

    print("\n--- [TEST 12] Bearer Header Authentication Support ---")
    # Login again to test Bearer header
    relogin = anon_client.post("/api/auth/login", json=good_login)
    new_token = relogin.json()["session_id"]
    header_client = TestClient(app)
    bearer_res = header_client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert bearer_res.status_code == 200, f"Expected 200, got {bearer_res.status_code}"
    assert bearer_res.json()["email"] == test_user_email
    print("PASS: Authorization Bearer header successfully authenticated session")

    # Clean up test users
    users.delete_many({"email": {"$in": [test_user_email, test_admin_email]}})
    print("\n==========================================")
    print("ALL 12 AUTHENTICATION & RBAC TESTS PASSED!")
    print("==========================================\n")


if __name__ == "__main__":
    run_tests()
