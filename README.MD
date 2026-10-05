# AI Voice Receptionist

An AI-powered voice receptionist for hospitals that handles common patient enquiries, provides hospital information, and assists with appointments.

## Technologies

- Frontend: Next.js
- Backend: FastAPI (Python)
- Database: MongoDB
- Cache / Sessions: Redis
- AI: Speech-to-Text (Deepgram/Whisper), LLM, Text-to-Speech

## Project Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-voice-receptionist
```

### Backend Setup

```bash
cd backend
python -m venv venv
```

- Activate the virtual environment and install dependencies:

```bash
pip install -r requirements.txt
```

#### Run the backend:

```bash
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Authentication & RBAC Module

For full documentation on user registration, login, Redis session management, and Role-Based Access Control (RBAC), see [AUTHENTICATION.md](backend/AUTHENTICATION.md).

Run the automated test suite:
```bash
cd backend
python test_auth.py
```

