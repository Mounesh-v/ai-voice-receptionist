import secrets
import bcrypt


def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.
    Generates a secure salt and returns the utf-8 decoded hash string.
    Never stores or logs the plaintext password.
    """
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_bytes.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify that a plaintext password matches the bcrypt hash.
    Safe against timing attacks.
    """
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def generate_session_id() -> str:
    """
    Generate a cryptographically secure random session ID token.
    Uses Python's secrets module (cryptographically strong pseudo-random number generator).
    """
    return secrets.token_urlsafe(32)
