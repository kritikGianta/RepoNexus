from __future__ import annotations

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from app.core.config import get_settings
from app.ml.types import DebtFindingDraft

settings = get_settings()

SYSTEM_PROMPT = """
You are a senior staff engineer specialized in production code reviews.
Given a debt finding and nearby repository context, produce:
1) WHY: a concise explanation of the risk and impact.
2) FIX: concrete refactor guidance and improved code where possible.
Keep output practical and specific to the provided code context.
""".strip()


from app.core.ai_client import groq_manager

class RAGEngine:
    def __init__(self) -> None:
        pass

    def _get_client(self):
        return groq_manager.get_client(temperature=0.2, max_tokens=1200, timeout=20)

    def generate_explanation_and_fix(self, finding: DebtFindingDraft, context_chunks: list[str]) -> tuple[str, str]:
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
WHY:\n<explanation>
FIX:\n<refactor suggestion with example code if possible>
""".strip()

        def _do_invoke(client):
            return client.invoke([SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)])

        try:
            try:
                response = _do_invoke(self._get_client())
            except Exception as e:
                err = str(e).lower()
                if ("rate_limit" in err or "429" in err) and groq_manager.rotate_key():
                    response = _do_invoke(self._get_client())
                else:
                    raise e
            
            text = str(response.content)
        except Exception:
            return (
                "This pattern increases maintenance and failure risk over time.",
                "Refactor to reduce complexity, improve naming/documentation, and add tests around changed behavior.",
            )

        why_marker = "WHY:"
        fix_marker = "FIX:"

        if why_marker in text and fix_marker in text:
            why_part = text.split(why_marker, maxsplit=1)[1].split(fix_marker, maxsplit=1)[0].strip()
            fix_part = text.split(fix_marker, maxsplit=1)[1].strip()
            return why_part, fix_part

        return (
            text[:800],
            "Introduce a focused refactor with smaller functions, clearer names, and test coverage for the modified flow.",
        )
