"""Background memory updater test (real Mongo + Groq + Qdrant).

Run:  python Test/test_memory_updater.py
"""

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

import asyncio
import uuid

from config import MEMORY_SUMMARY_TRIGGER_TOKENS, MEMORY_RECENT_MESSAGES
from services.conversation_memory import (
    end_conversation,
    save_message,
    start_conversation,
)
from services.memory.stores import (
    get_user_facts,
    get_user_summary,
    get_user_summary_doc,
)
from services.memory.updater import (
    _run_memory_update,
    schedule_memory_update,
)


async def test_full_update_cycle():
    user_id = f"test-updater-{uuid.uuid4()}"
    conversation_id = start_conversation(user_id)

    try:
        # Seed enough history to cross the summary threshold AND
        # exceed the recent-message window.
        filler = (
            "I would like to discuss the visiting hours and the "
            "cardiology department details in some depth, including "
            "parking and reception procedures. "
        )
        total_messages = MEMORY_RECENT_MESSAGES + 6
        for i in range(total_messages):
            role = "user" if i % 2 == 0 else "assistant"
            content = (
                f"turn {i}: " + filler * (4 + i % 3)
            )
            save_message(conversation_id, user_id, role, content)

        # A final exchange with a stable fact for extraction.
        save_message(
            conversation_id,
            user_id,
            "user",
            "By the way, my name is Testimus and I prefer Hindi replies.",
        )
        save_message(
            conversation_id,
            user_id,
            "assistant",
            "Noted, Testimus. I will remember your name and language preference.",
        )

        await _run_memory_update(
            user_id,
            conversation_id,
            "By the way, my name is Testimus and I prefer Hindi replies.",
            "Noted, Testimus. I will remember your name and language preference.",
        )

        # 1) Rolling summary must exist with a cutoff.
        summary = get_user_summary(user_id)
        assert summary, "rolling summary was not created"
        doc = get_user_summary_doc(user_id)
        assert doc.get("cutoff_at") is not None, "summary cutoff missing"
        print(f"summary OK -> {summary[:100]!r}")

        # 2) Stable facts extracted.
        facts = get_user_facts(user_id)
        joined = " ".join(facts).lower()
        assert "testimus" in joined or "hindi" in joined, facts
        print(f"facts OK -> {facts}")

        # 3) Re-running must be idempotent-ish: summary still present,
        #    facts not duplicated unboundedly.
        await _run_memory_update(
            user_id,
            conversation_id,
            "hello",
            "hello",
        )
        assert get_user_summary(user_id)
        facts_after = get_user_facts(user_id)
        assert len(facts_after) <= len(facts) + 2, facts_after
        print("re-run OK (no blow-up)")

        # 4) schedule_memory_update creates a background task without
        #    raising (fire-and-forget path used by voice.py).
        schedule_memory_update(
            user_id,
            conversation_id,
            "hello again",
            "Hi again!",
        )
        await asyncio.sleep(0.1)
        print("schedule OK")

    finally:
        try:
            end_conversation(conversation_id, user_id)
        except Exception:
            pass


async def main():
    await test_full_update_cycle()
    print("ALL OK")


if __name__ == "__main__":
    asyncio.run(main())
