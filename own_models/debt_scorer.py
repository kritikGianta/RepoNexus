"""
debt_scorer.py — RepoNexus Technical Debt Health Scorer (Inference)
====================================================================
Loads the trained XGBoost model and scores source files on a 0-100 
technical debt scale.  Higher = more debt.

Usage:
    from own_models.debt_scorer import score_files
    results = score_files({"path/to/file.py": "<source code>", ...})
"""

import pickle
import re
import ast
from pathlib import Path

_MODEL_PATH = Path(__file__).parent / "debt_scorer_model.pkl"
_model_data = None


def _load():
    global _model_data
    if _model_data is None:
        if not _MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Debt scorer model not found at {_MODEL_PATH}. "
                "Run: python own_models/train_debt_scorer.py"
            )
        with open(_MODEL_PATH, "rb") as f:
            _model_data = pickle.load(f)


def _extract_features(code: str, filename: str = "") -> list:
    lines = code.splitlines()
    total_lines = max(len(lines), 1)

    blank_lines   = sum(1 for l in lines if l.strip() == "")
    comment_lines = sum(1 for l in lines if l.strip().startswith("#") or l.strip().startswith("//"))
    code_lines    = total_lines - blank_lines - comment_lines
    comment_ratio = comment_lines / total_lines
    todo_count    = len(re.findall(r"\b(TODO|FIXME|HACK|XXX|BUG)\b", code, re.IGNORECASE))
    line_limit    = 180 if any(filename.endswith(e) for e in [".jsx", ".tsx", ".js", ".vue"]) else 120
    long_lines    = sum(1 for l in lines if len(l) > line_limit)

    max_indent = 0
    for l in lines:
        stripped = l.lstrip()
        if stripped:
            indent = (len(l) - len(stripped)) // 4
            max_indent = max(max_indent, indent)

    func_count, avg_func_length, empty_func_count, import_count, class_count = 0, 0.0, 0, 0, 0

    if filename.endswith(".py"):
        try:
            tree = ast.parse(code)
            funcs = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            func_count = len(funcs)
            if funcs:
                lengths = []
                for f in funcs:
                    end    = f.end_lineno if hasattr(f, "end_lineno") else f.lineno
                    lengths.append(end - f.lineno)
                    body_stmts = [s for s in f.body if not isinstance(s, ast.Expr)]
                    if len(body_stmts) == 0:
                        empty_func_count += 1
                avg_func_length = sum(lengths) / len(lengths)
            import_count = sum(1 for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom)))
            class_count  = sum(1 for n in ast.walk(tree) if isinstance(n, ast.ClassDef))
        except SyntaxError:
            pass
    elif any(filename.endswith(ext) for ext in [".js", ".ts", ".jsx", ".tsx"]):
        func_count   = len(re.findall(r"\b(?:function|=>)\b", code))
        import_count = len(re.findall(r"^import\s+", code, re.MULTILINE))

    return [total_lines, code_lines, round(comment_ratio, 4), todo_count,
            long_lines, max_indent, func_count, round(avg_func_length, 2),
            empty_func_count, import_count, class_count]


def score_files(files: dict[str, str]) -> list[dict]:
    """
    Score each file in {path: code} dict.
    Returns list of dicts sorted by debt_score descending.
    """
    _load()
    import numpy as np

    model = _model_data["model"]
    results = []

    for path, code in files.items():
        features = _extract_features(code, path)
        score    = float(model.predict(np.array([features]))[0])
        score    = max(0.0, min(score, 100.0))

        # Derive a human-readable severity
        if score >= 75:
            severity = "Critical"
            advice   = "Major refactoring required. High risk of bugs and slow onboarding."
        elif score >= 50:
            severity = "High"
            advice   = "Significant debt. Consider refactoring before next sprint."
        elif score >= 25:
            severity = "Medium"
            advice   = "Moderate debt. Add comments, reduce function length, and resolve TODOs."
        else:
            severity = "Low"
            advice   = "Healthy file. Minimal technical debt detected."

        results.append({
            "file":        path,
            "debt_score":  round(score, 1),
            "severity":    severity,
            "advice":      advice,
        })

    # Sort highest debt first
    results.sort(key=lambda r: r["debt_score"], reverse=True)
    return results
