"""Memory stores + token helpers roundtrip test (real MongoDB)."""

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import uuid

from services.memory.stores import (
    add_user_facts,
    get_user_facts,
    get_user_summary,
    get_user_summary_doc,
    save_user_summary,
)
from services.memory.tokens import (
    estimate_message_tokens,
    estimate_tokens,
)


def test_tokens():
    assert estimate_tokens("") == 0
    assert estimate_tokens("hello") > 0

    # Roughly chars/4 at minimum; must be sane for a long text.
    long_text = "word " * 500
    assert estimate_tokens(long_text) > 100

    cost = estimate_message_tokens(
        {"role": "user", "content": "hello"}
    )
    assert cost > estimate_tokens("hello")
    print("tokens OK")


def test_summary_roundtrip():
    user_id = f"test-user-{uuid.uuid4()}"

    assert get_user_summary(user_id) == ""

    save_user_summary(user_id, "Caller prefers Hindi replies.")
    assert get_user_summary(user_id) == "Caller prefers Hindi replies."

    save_user_summary(user_id, "Updated summary text.")
    assert get_user_summary(user_id) == "Updated summary text."

    doc = get_user_summary_doc(user_id)
    assert doc.get("summary") == "Updated summary text."
    assert "updated_at" in doc
    print("summary roundtrip OK")


def test_facts_roundtrip():
    user_id = f"test-user-{uuid.uuid4()}"

    assert get_user_facts(user_id) == []

    result = add_user_facts(
        user_id,
        ["Prefers Hindi for replies", "Interested in cardiology"],
        source="conversation-1",
    )
    assert len(result) == 2
    assert get_user_facts(user_id) == result

    # Duplicate (case-insensitive) is ignored.
    result = add_user_facts(
        user_id,
        ["prefers hindi for replies", "Lives in Delhi"],
        source="conversation-2",
    )
    assert len(result) == 3
    assert "Lives in Delhi" in result

    # Empty adds change nothing.
    before = get_user_facts(user_id)
    assert add_user_facts(user_id, [], source="x") == before
    print("facts roundtrip OK")


if __name__ == "__main__":
    test_tokens()
    test_summary_roundtrip()
    test_facts_roundtrip()
    print("ALL OK")
