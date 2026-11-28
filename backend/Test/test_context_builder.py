"""Context Builder budget enforcement test (pure functions, no I/O)."""

import sys
from pathlib import Path

sys.path.insert(
    0,
    str(Path(__file__).resolve().parents[1]),
)

from services.memory.context_builder import (
    build_context,
    build_memory_block,
    trim_history,
    truncate_to_tokens,
)
from services.memory.tokens import estimate_message_tokens, estimate_tokens


def test_truncate():
    text = "alpha beta gamma delta epsilon zeta eta theta"
    clipped = truncate_to_tokens(text, 5)
    assert clipped.endswith("...")
    assert estimate_tokens(clipped) <= 8  # small slack for the ellipsis
    # Short text passes through untouched.
    assert truncate_to_tokens("hi", 100) == "hi"
    assert truncate_to_tokens("anything", 0) == ""
    print("truncate OK")


def test_trim_history_drops_oldest():
    messages = [
        {"role": "user", "content": f"message number {i} " + "x" * 80}
        for i in range(30)
    ]

    # Tiny budget: only the newest few survive, order preserved.
    kept = trim_history(messages, max_tokens=100)
    assert 0 < len(kept) < len(messages)
    assert kept == messages[-len(kept):]
    assert kept[-1]["content"] == messages[-1]["content"]

    # Huge budget: everything survives.
    assert len(trim_history(messages, 100_000)) == 30

    # Zero budget: nothing.
    assert trim_history(messages, 0) == []
    print("trim_history OK")


def test_build_context_never_exceeds_budget():
    summary = "Earlier conversation summary. " * 40
    facts = [f"Fact {i} about the caller with some detail" for i in range(30)]
    snippets = [f"Past snippet {i} " + "y" * 60 for i in range(10)]
    messages = [
        {"role": "user" if i % 2 == 0 else "assistant",
         "content": f"turn {i}: " + "z" * 120}
        for i in range(40)
    ]
    rag_context = "RAG context " * 200

    budget = 800
    result = build_context(
        summary=summary,
        facts=facts,
        semantic_snippets=snippets,
        messages=messages,
        rag_context=rag_context,
        budget_tokens=budget,
    )

    memory_text = result["memory_context"]
    history = result["history"]

    history_tokens = sum(estimate_message_tokens(m) for m in history)
    memory_tokens = estimate_tokens(memory_text)

    # Full history is never included.
    assert len(history) < len(messages)

    # Memory block respects its share of the budget.
    assert memory_tokens <= budget

    # History + memory stay within the overall budget (RAG context is
    # delivered separately by the LLM call, but is capped by design).
    assert history_tokens + memory_tokens <= budget

    # Oldest messages were the ones dropped.
    if history:
        assert history[0]["content"] == messages[len(messages) - len(history)][
            "content"
        ]
    print(
        f"build_context OK (history={len(history)} msgs, "
        f"history_tokens={history_tokens}, memory_tokens={memory_tokens})"
    )


def test_build_context_small_budget_does_not_crash():
    result = build_context(
        summary="s" * 5000,
        facts=["f1", "f2"],
        semantic_snippets=["snip"],
        messages=[{"role": "user", "content": "hello"}],
        rag_context="r" * 5000,
        budget_tokens=50,
    )
    assert result["memory_context"] is not None
    assert isinstance(result["history"], list)
    assert len(result["history"]) <= 1
    print("small budget OK")


def test_build_memory_block_empty():
    assert build_memory_block("", [], [], 100) == ""
    assert build_memory_block("s", [], [], 0) == ""
    block = build_memory_block("summary here", ["a fact"], ["snip"], 500)
    assert "summary here" in block
    assert "a fact" in block
    print("memory block OK")


if __name__ == "__main__":
    test_truncate()
    test_trim_history_drops_oldest()
    test_build_context_never_exceeds_budget()
    test_build_context_small_budget_does_not_crash()
    test_build_memory_block_empty()
    print("ALL OK")
