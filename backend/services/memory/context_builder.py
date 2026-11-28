"""Context Builder: assemble LLM context within a token budget.

Guarantees (by construction):
- The full conversation history is NEVER sent; only the most recent
  messages that fit the remaining budget are kept (oldest dropped
  first).
- The rolling summary, long-term facts and semantic snippets share a
  capped memory block.
- The RAG business context has its own reserve so memory can never
  crowd out retrieval.
"""

from __future__ import annotations

from services.memory.tokens import (
    estimate_message_tokens,
    estimate_tokens,
)

# Share of the total budget reserved for the RAG business context.
RAG_RESERVE_RATIO = 0.40

# Share of the total budget for the memory block (summary + facts +
# semantic snippets) once the RAG reserve is taken out.
MEMORY_BLOCK_RATIO = 0.55


def truncate_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to roughly max_tokens, cutting at a word end."""
    if max_tokens <= 0:
        return ""

    if estimate_tokens(text) <= max_tokens:
        return text

    # Binary-search the longest prefix that fits (word aligned).
    words = text.split()
    low, high = 0, len(words)
    best = ""

    while low <= high:
        mid = (low + high) // 2
        candidate = " ".join(words[:mid])
        if estimate_tokens(candidate) <= max_tokens:
            best = candidate
            low = mid + 1
        else:
            high = mid - 1

    if best and len(best) < len(text):
        return best.rstrip() + " ..."
    return best


def build_memory_block(
    summary: str,
    facts: list[str],
    semantic_snippets: list[str],
    max_tokens: int,
) -> str:
    """Build the memory text block within max_tokens."""
    if max_tokens <= 0:
        return ""

    parts: list[str] = []

    # 1) Rolling summary gets first claim (up to half the block).
    summary_text = (summary or "").strip()
    if summary_text:
        summary_cap = max(1, int(max_tokens * 0.5))
        clipped = truncate_to_tokens(summary_text, summary_cap)
        if clipped:
            parts.append(
                "[Summary of earlier conversation]\n" + clipped
            )

    used = estimate_tokens("\n\n".join(parts))
    remaining = max_tokens - used

    # 2) Long-term facts next.
    fact_lines = [
        f"- {fact.strip()}"
        for fact in (facts or [])
        if isinstance(fact, str) and fact.strip()
    ]
    if fact_lines and remaining > 0:
        fact_cap = max(1, int(max_tokens * 0.30))
        block: list[str] = []
        used_facts = 0
        for line in fact_lines:
            cost = estimate_tokens(line) + 1
            if used_facts + cost > min(fact_cap, remaining):
                break
            block.append(line)
            used_facts += cost
        if block:
            text = "[Known facts about this caller]\n" + "\n".join(block)
            parts.append(text)
            remaining -= used_facts

    # 3) Semantic snippets last (they are redundant with the above).
    snippet_lines = [
        f"- {str(s).strip()}"
        for s in (semantic_snippets or [])
        if str(s).strip()
    ]
    if snippet_lines and remaining > 0:
        block = []
        used_snips = 0
        for line in snippet_lines:
            cost = estimate_tokens(line) + 1
            if used_snips + cost > remaining:
                break
            block.append(line)
            used_snips += cost
        if block:
            parts.append(
                "[Relevant details from past conversations]\n"
                + "\n".join(block)
            )

    return "\n\n".join(parts)


def trim_history(
    messages: list[dict],
    max_tokens: int,
) -> list[dict]:
    """Keep only the newest messages that fit max_tokens.

    Oldest messages are dropped first. Each message must be a
    {"role": ..., "content": ...} dict.
    """
    if max_tokens <= 0 or not messages:
        return []

    kept: list[dict] = []
    used = 0

    # Walk newest -> oldest, then restore chronological order.
    for message in reversed(messages):
        cost = estimate_message_tokens(message)
        if used + cost > max_tokens:
            break
        kept.append(message)
        used += cost

    kept.reverse()
    return kept


def build_context(
    *,
    summary: str,
    facts: list[str],
    semantic_snippets: list[str],
    messages: list[dict],
    rag_context: str,
    budget_tokens: int,
) -> dict:
    """Split budget_tokens across RAG context, memory and history.

    Returns {"memory_context": str, "history": list[dict]} where
    history never contains the full conversation.
    """
    if budget_tokens <= 0:
        return {"memory_context": "", "history": []}

    rag_tokens = estimate_tokens(rag_context or "")
    rag_reserve = int(budget_tokens * RAG_RESERVE_RATIO)

    # Memory + history share whatever the RAG context did not eat.
    remaining_after_rag = max(0, budget_tokens - min(rag_tokens, rag_reserve))
    # If RAG exceeded its reserve, it still may leave little room;
    # history gets a hard floor so multi-turn recall always works.
    memory_budget = int(remaining_after_rag * MEMORY_BLOCK_RATIO)
    history_budget = max(0, remaining_after_rag - memory_budget)

    # Hard floor for history: at least 25% of the total budget when
    # anything remains at all.
    if remaining_after_rag > 0 and history_budget < budget_tokens // 4:
        history_budget = min(
            budget_tokens // 4,
            remaining_after_rag,
        )
        memory_budget = max(0, remaining_after_rag - history_budget)

    memory_context = build_memory_block(
        summary=summary,
        facts=facts,
        semantic_snippets=semantic_snippets,
        max_tokens=memory_budget,
    )

    history = trim_history(messages, history_budget)

    return {
        "memory_context": memory_context,
        "history": history,
    }
