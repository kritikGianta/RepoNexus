from __future__ import annotations

import re

import spacy


class NLPAnalyzer:
    def __init__(self) -> None:
        # Avoid loading heavy Spacy models in production to save RAM (512MB limit)
        self.vague_tokens = {"todo", "fixme", "later", "stuff", "thing", "hack", "refactor"}

    def analyze_documentation(self, content: str) -> dict:
        comments = self._extract_comments_and_docstrings(content)
        total_lines = len(content.splitlines()) or 1
        doc_density = len(comments) / total_lines

        quality_penalty = 0
        
        for block in comments:
            # Simple word-based analysis instead of heavy NLP
            words = set(re.findall(r"\w+", block.lower()))
            if words.intersection(self.vague_tokens):
                quality_penalty += 1

        return {
            "doc_density": round(doc_density, 4),
            "comment_blocks": len(comments),
            "quality_penalty": quality_penalty,
        }

    def _extract_comments_and_docstrings(self, content: str) -> list[str]:
        comments = []
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("#") or stripped.startswith("//"):
                comments.append(stripped)

        triple_quote_pattern = re.compile(r'"""(.*?)"""|\'\'\'(.*?)\'\'\'', re.DOTALL)
        for match in triple_quote_pattern.findall(content):
            comments.extend([block for block in match if block])

        return comments
