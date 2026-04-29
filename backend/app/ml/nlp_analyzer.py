from __future__ import annotations

import re

import spacy


class NLPAnalyzer:
    def __init__(self) -> None:
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except Exception:
            self.nlp = spacy.blank("en")

    def analyze_documentation(self, content: str) -> dict:
        comments = self._extract_comments_and_docstrings(content)
        total_lines = len(content.splitlines()) or 1
        doc_density = len(comments) / total_lines

        quality_penalty = 0
        vague_tokens = {"todo", "fixme", "later", "stuff", "thing"}

        for block in comments:
            doc = self.nlp(block.lower())
            lemmas = {token.lemma_ for token in doc if token.is_alpha}
            if lemmas.intersection(vague_tokens):
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
