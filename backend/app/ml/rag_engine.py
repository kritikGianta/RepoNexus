from __future__ import annotations

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.ai_client import groq_manager, invoke_llm
from app.ml.types import DebtFindingDraft

SYSTEM_PROMPT = """
You are a senior staff engineer specialized in production code reviews.
Given a debt finding and nearby repository context, produce:
1) WHY: a concise explanation of the risk and impact.
2) FIX: concrete refactor guidance and improved code where possible.
Keep output practical and specific to the provided code context.
""".strip()

FALLBACK_WHY = "This pattern increases maintenance cost and failure risk over time."
FALLBACK_FIX = "Refactor to reduce complexity, improve naming/documentation, and add tests around the changed behavior."


class RAGEngine:
    @property
    def available(self) -> bool:
        return groq_manager.available

    def generate_explanation_and_fix(self, finding: DebtFindingDraft, context_chunks: list[str]) -> tuple[str, str]:
        if not self.available:
            return FALLBACK_WHY, FALLBACK_FIX

        context = "\n\n".join(context_chunks[:4])
        user_prompt = f"""
Debt category: {finding.debt_category.value}
Severity: {finding.severity_level.value}
Title: {finding.title}
Description: {finding.description}
File: {finding.file_path}:{finding.start_line}-{finding.end_line}
Offending code:
{finding.offending_code_snippet}

Relevant repository context:
{context}

Respond with exactly this format:
WHY:
<explanation>
FIX:
<refactor suggestion with example code if possible>
""".strip()

        try:
            response = invoke_llm(
                [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)],
                temperature=0.2,
                max_tokens=1200,
                timeout=30,
            )
            text = str(response.content)
        except Exception:  # noqa: BLE001
            return FALLBACK_WHY, FALLBACK_FIX

        if "WHY:" in text and "FIX:" in text:
            why_part = text.split("WHY:", maxsplit=1)[1].split("FIX:", maxsplit=1)[0].strip()
            fix_part = text.split("FIX:", maxsplit=1)[1].strip()
            return why_part, fix_part
        return text[:800], FALLBACK_FIX
