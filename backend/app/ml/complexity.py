from __future__ import annotations

from pathlib import Path

from radon.complexity import cc_visit
from radon.metrics import h_visit, mi_visit


class ComplexityAnalyzer:
    def analyze(self, path: str, content: str) -> dict:
        extension = Path(path).suffix.lower()
        if extension != ".py":
            return self._heuristic_non_python(content)

        try:
            complexity_blocks = cc_visit(content)
            mi_score = float(mi_visit(content, True))
            halstead = h_visit(content)
        except Exception:
            return {
                "cyclomatic_max": 0.0,
                "maintainability_index": 100.0,
                "halstead_volume": 0.0,
                "high_complexity_spans": [],
            }

        high_complexity_spans = []
        max_cc = 0.0
        for block in complexity_blocks:
            max_cc = max(max_cc, float(block.complexity))
            if block.complexity >= 12:
                high_complexity_spans.append(
                    {
                        "name": block.name,
                        "start_line": block.lineno,
                        "end_line": getattr(block, "endline", block.lineno),
                        "complexity": float(block.complexity),
                    }
                )

        return {
            "cyclomatic_max": max_cc,
            "maintainability_index": mi_score,
            "halstead_volume": float(getattr(halstead.total, "volume", 0.0)),
            "high_complexity_spans": high_complexity_spans,
        }

    def _heuristic_non_python(self, content: str) -> dict:
        lines = content.splitlines()
        long_functions = []

        cursor = 0
        while cursor < len(lines):
            line = lines[cursor]
            if "function" in line or "=>" in line or line.strip().startswith("def "):
                start = cursor + 1
                end = min(len(lines), cursor + 35)
                length = end - start
                if length >= 30:
                    long_functions.append(
                        {
                            "name": "heuristic_function",
                            "start_line": start,
                            "end_line": end,
                            "complexity": min(30.0, 10.0 + length / 3),
                        }
                    )
                cursor = end
            cursor += 1

        return {
            "cyclomatic_max": max((span["complexity"] for span in long_functions), default=0.0),
            "maintainability_index": max(20.0, 100.0 - len(long_functions) * 7.5),
            "halstead_volume": float(len(content) / 8),
            "high_complexity_spans": long_functions,
        }
