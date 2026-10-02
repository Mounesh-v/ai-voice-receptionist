# Authentication, Redis Sessions & Role-Based Access Control (RBAC)

This document provides a comprehensive technical overview of the Authentication, Redis Session Management, and Role-Based Access Control (RBAC) modules for the **Smart AI Voice Receptionist for Hospitals** project.

---

## 1. Architecture Overview

```
                      NEXT.JS FRONTEND
                             │
            HTTP Requests / WebSocket Connection
                             ▼
                      FASTAPI BACKEND
                             │
             ┌───────────────┴───────────────┐
             ▼                               ▼
        AUTH ROUTER                    VOICE ROUTER
             │                               │
             ▼                               ▼
       MongoDB (Users)               Deepgram (Speech)
             │
             ▼
       Redis Sessions
  (session:<session_id>, TTL)
             │
             ▼
      Auth Middleware / Dependency
             │
        ┌────┴────┐
        ▼         ▼
      USER      ADMIN
        │         │
        ▼         ▼
    User APIs  Admin APIs
```

---

## 2. MongoDB Users Collection

### Schema
```json
{
    "_id": ObjectId("..."),
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password_hash": "$2b$12$...",
    "role": "user"
}
```

### Roles
- `user`: Hospital patient or standard visitor (default for all public registrations).
- `admin`: Hospital staff / administrator with access to appointments, doctors, services, and statistics.

### Security Guarantees
- **Strict Role Enforcement**: Public registration (`POST /api/auth/register`) strictly sets `role="user"`. Any client payload attempting to specify `"role": "admin"` is ignored.
- **Controlled Admin Provisioning**: Admin accounts can only be created via the secure CLI utility script (`python scripts/create_admin.py`) or by an existing authenticated admin (`POST /api/admin/create-admin`).
- **Unique Email Index**: A unique index on `email` is enforced at the MongoDB database level to prevent duplicate registrations and race conditions.

---

## 3. Redis Session Architecture

### Session Key & Data
- **Key Pattern**: `session:<session_id>`
- **Format**: JSON serialized object
- **Payload**:
  ```json
  {
      "user_id": "6750abcd1234567890abcdef",
      "role": "user",
      "email": "jane@example.com",
      "name": "Jane Doe"
  }
  ```
- **Expiration (TTL)**: Configurable via `SESSION_TTL` in `.env` (default: 3600 seconds / 1 hour).
- **Session ID Generation**: Cryptographically secure 256-bit URL-safe random token generated using Python's `secrets.token_urlsafe(32)`.

### Session Transport & Dual-Mode Client Support
1. **HttpOnly Cookie (Primary - Browser / Next.js)**:
   - Sets cookie: `session_id=<token>`
   - `HttpOnly=True`: Inaccessible to client-side JavaScript, protecting against XSS attacks.
   - `SameSite=lax`: Protects against Cross-Site Request Forgery (CSRF).
   - `Secure=True` in production (requires HTTPS).
2. **Authorization Header (Secondary - API Tools / Mobile / Swagger)**:
   - Supports `Authorization: Bearer <session_id>` and `X-Session-ID: <session_id>`.

---

## 4. Authentication Flows

### Registration Flow (`POST /api/auth/register`)
1. Client submits `{ name, email, password }`.
2. Validates input (Pydantic email normalization, minimum password length 6).
3. Checks if `email` already exists in MongoDB. Returns `409 Conflict` if duplicate.
4. Hashes password using `bcrypt.gensalt(12)`. Plaintext is never stored or logged.
5. Inserts document into MongoDB with `role="user"`.
6. Returns safe user object (id, name, email, role). Never exposes password or hash.

### Login Flow (`POST /api/auth/login`)
1. Client submits `{ email, password }`.
2. Looks up user by normalized email in MongoDB.
3. Compares submitted password against `password_hash` using `bcrypt.checkpw()`.
4. If invalid, returns `401 Unauthorized` with generic error `"Invalid email or password"`.
5. If valid, generates a random session token via `secrets.token_urlsafe(32)`.
6. Stores session data in Redis with TTL.
7. Sets `HttpOnly` cookie and returns session ID + user profile.

### Logout Flow (`POST /api/auth/logout`)
1. Identifies the active session from the cookie or Authorization header.
2. Deletes key `session:<session_id>` from Redis, immediately invalidating the session.
3. Clears the session cookie from the client's browser.
4. Subsequent requests using that session token return `401 Unauthorized`.

---

## 5. Role-Based Access Control (RBAC)

### Reusable Dependencies (`backend/middleware/auth.py`)

Other teammates can protect their routes simply by importing and adding the dependency:

```python
from fastapi import APIRouter, Depends
from middleware.auth import require_authenticated_user, require_admin, AuthenticatedUser

router = APIRouter()

# Any logged-in user or admin
@router.get("/appointments/my")
async def get_my_appointments(user: AuthenticatedUser = Depends(require_authenticated_user)):
    return {"user_id": user.user_id, "appointments": []}

# Admin only (e.g. view all appointments, manage doctors)
@router.get("/admin/appointments")
async def get_all_appointments(admin: AuthenticatedUser = Depends(require_admin)):
    return {"message": "All hospital appointments"}
```

### 401 vs 403 HTTP Status Codes
- **401 Unauthorized**: The client is unauthenticated (no session token provided, invalid token, or expired Redis session).
- **403 Forbidden**: The client is authenticated, but their assigned role lacks permission to access the requested resource (e.g. a `user` attempting to access an `admin`-only endpoint).

---

## 6. Environment Variables (`.env`)

| Variable | Description | Example / Default |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://...` |
| `MONGO_DB_NAME` | MongoDB database name | `ai_voice_receptionist` |
| `REDIS_URL` | Redis connection URL | `redis://localhost:6379/0` |
| `SESSION_TTL` | Session TTL in seconds | `3600` (1 hour) |
| `SESSION_COOKIE_NAME` | Cookie name | `session_id` |
| `SESSION_COOKIE_SECURE` | HTTPS-only cookie | `False` (dev) / `True` (prod) |
| `DEEPGRAM_API_KEY` | Deepgram speech-to-text key | `your_api_key` |

---

## 7. How to Run the Backend

### 1. Activate Virtual Environment
**PowerShell:**
```powershell
cd backend
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
cd backend
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Create Admin Account (Controlled CLI)
```bash
python scripts/create_admin.py --name "Hospital Admin" --email "admin@hospital.com" --password "AdminPass@123"
```

### 4. Start the Application
```bash
uvicorn main:app --reload
```

Interactive API documentation will be available at:
`http://localhost:8000/docs`

---

## 8. Running the Automated Test Suite

Run the complete 12-scenario automated test suite:

```bash
python test_auth.py
```

Test coverage includes:
- Health check verification (`/health`)
- User registration & duplicate email handling (409)
- Enforced `role="user"` verification
- Bcrypt hash storage validation in MongoDB
- Login with correct / incorrect credentials (401)
- Redis session generation & TTL
- `/api/auth/me` profile retrieval
- RBAC restriction on `/api/admin/test` (403 for users, 200 for admins)
- Session invalidation & cookie clearance on logout (subsequent 401)
- Bearer header authentication support
