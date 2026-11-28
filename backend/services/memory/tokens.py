"""Token estimation helpers for memory budgeting."""

from __future__ import annotations

try:
    import tiktoken

    _ENCODER = tiktoken.get_encoding("o200k_base")
except Exception:  # pragma: no cover - tiktoken always installed in venv
    _ENCODER = None


def estimate_tokens(text: str) -> int:
    """Estimate the token count of a text string.

    Uses the o200k_base tokenizer when available, otherwise falls
    back to a rough chars/4 heuristic. Never raises.
    """
    if not text:
        return 0

    if _ENCODER is not None:
        try:
            return len(_ENCODER.encode(text))
        except Exception:
            pass

    return max(1, len(text) // 4)


def estimate_message_tokens(message: dict) -> int:
    """Token cost of a {"role": ..., "content": ...} message."""
    content = message.get("content") or ""
    # Small per-message overhead for role markers.
    return estimate_tokens(content) + 4
