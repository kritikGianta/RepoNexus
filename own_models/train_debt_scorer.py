"""
train_debt_scorer.py — RepoNexus Technical Debt Health Scorer
==============================================================
Trains a lightweight XGBoost regression model locally.
Data comes from:
  1. All source files in this project
  2. Real files pulled from 10 popular GitHub repos via the API

Run once:
    cd DebtLens
    python own_models/train_debt_scorer.py

Saves: own_models/debt_scorer_model.pkl
"""

import ast
import os
import re
import json
import pickle
import time
import requests
from pathlib import Path

# ── Install dependencies if missing ─────────────────────────
try:
    import xgboost as xgb
    import numpy as np
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "xgboost", "numpy"])
    import xgboost as xgb
    import numpy as np

# ════════════════════════════════════════════════════════════
# STEP 1: FEATURE EXTRACTION
# ════════════════════════════════════════════════════════════

# File types that naturally have long lines due to syntax (JSX, templates)
RELAXED_LINE_LIMIT_EXTS = {".jsx", ".tsx", ".js", ".vue", ".html", ".svelte"}

def extract_features(code: str, filename: str = "") -> dict:
    """
    Extract 11 deterministic code quality metrics from a source file.
    """
    ext   = Path(filename).suffix.lower()
    lines = code.splitlines()
    total_lines = max(len(lines), 1)

    blank_lines   = sum(1 for l in lines if l.strip() == "")
    comment_lines = sum(1 for l in lines if l.strip().startswith(("#", "//", "/*", "*")))
    code_lines    = total_lines - blank_lines - comment_lines
    comment_ratio = comment_lines / total_lines

    todo_count    = len(re.findall(r"\b(TODO|FIXME|HACK|XXX|BUG)\b", code, re.IGNORECASE))

    # JSX/HTML files have naturally long lines due to attribute syntax
    line_limit = 180 if ext in RELAXED_LINE_LIMIT_EXTS else 120
    long_lines = sum(1 for l in lines if len(l) > line_limit)

    # Max nesting depth as complexity proxy
    max_indent = 0
    for l in lines:
        stripped = l.lstrip()
        if stripped:
            indent = (len(l) - len(stripped)) // 4
            max_indent = max(max_indent, indent)

    func_count, avg_func_length, empty_func_count, import_count, class_count = 0, 0.0, 0, 0, 0

    if ext == ".py":
        try:
            tree = ast.parse(code)
            funcs = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
            func_count = len(funcs)
            if funcs:
                lengths = []
                for f in funcs:
                    end = f.end_lineno if hasattr(f, "end_lineno") else f.lineno
                    lengths.append(max(end - f.lineno, 1))
                    body_stmts = [s for s in f.body if not isinstance(s, ast.Expr)]
                    if len(body_stmts) == 0:
                        empty_func_count += 1
                avg_func_length = sum(lengths) / len(lengths)
            import_count = sum(1 for n in ast.walk(tree) if isinstance(n, (ast.Import, ast.ImportFrom)))
            class_count  = sum(1 for n in ast.walk(tree) if isinstance(n, ast.ClassDef))
        except SyntaxError:
            pass
    elif ext in {".js", ".ts", ".jsx", ".tsx"}:
        func_count   = len(re.findall(r"\b(?:function\b|=>)", code))
        import_count = len(re.findall(r"^import\s+", code, re.MULTILINE))

    return {
        "total_lines":      total_lines,
        "code_lines":       code_lines,
        "comment_ratio":    round(comment_ratio, 4),
        "todo_count":       todo_count,
        "long_lines":       long_lines,
        "max_indent":       max_indent,
        "func_count":       func_count,
        "avg_func_length":  round(avg_func_length, 2),
        "empty_func_count": empty_func_count,
        "import_count":     import_count,
        "class_count":      class_count,
    }


def compute_debt_score(f: dict, filename: str = "") -> float:
    """
    Heuristic formula — each component individually capped so no single
    factor can dominate the score and produce false Criticals.
    Max possible: 100.
    """
    ext   = Path(filename).suffix.lower()
    score = 0.0

    # File size debt — capped at 20 pts
    score += min(f["total_lines"] / 30.0, 20)

    # Low comment ratio — lower baseline for JS/JSX (JSDoc style)
    baseline = 0.05 if ext in RELAXED_LINE_LIMIT_EXTS else 0.10
    score += min(max(0.0, (baseline - f["comment_ratio"])) * 80, 12)

    # TODO/FIXME markers — capped at 15 pts
    score += min(f["todo_count"] * 4, 15)

    # Long lines — capped at 8 pts
    score += min(f["long_lines"] * 1.0, 8)

    # Deep nesting — capped at 12 pts (allow up to indent 3 for free)
    score += min(max(0, f["max_indent"] - 3) * 3, 12)

    # Long average function — capped at 10 pts
    score += min(f["avg_func_length"] / 7.0, 10)

    # Empty stub functions — capped at 12 pts
    score += min(f["empty_func_count"] * 4, 12)

    # Excessive coupling (imports > 12) — capped at 9 pts
    score += min(max(0, f["import_count"] - 12) * 1.5, 9)

    return min(round(score, 2), 100.0)


# ════════════════════════════════════════════════════════════
# STEP 2: COLLECT FILES — LOCAL + GITHUB
# ════════════════════════════════════════════════════════════
ALLOWED_EXTS = {".py", ".ts", ".tsx", ".js", ".jsx"}
SKIP_DIRS    = {"node_modules", "__pycache__", ".git", "dist", "build", "venv", ".venv", "scratch"}

def collect_local(root: Path):
    rows = []
    for path in root.rglob("*"):
        if path.suffix not in ALLOWED_EXTS:
            continue
        if any(p in SKIP_DIRS for p in path.parts):
            continue
        if path.stat().st_size > 500_000:
            continue
        try:
            code = path.read_text(encoding="utf-8", errors="ignore")
            features = extract_features(code, str(path))
            debt     = compute_debt_score(features, str(path))
            rows.append((list(features.values()), debt))
        except Exception:
            continue
    return rows


GITHUB_REPOS = [
    "pallets/flask",
    "django/django",
    "fastapi/fastapi",
    "psf/requests",
    "encode/httpx",
    "axios/axios",
    "expressjs/express",
    "vitejs/vite",
    "prettier/prettier",
    "sindresorhus/got",
]

def fetch_github_files(repos: list[str], max_per_repo: int = 80) -> list:
    """Fetch real source files from GitHub repos via the REST API."""
    rows = []
    headers = {"Accept": "application/vnd.github+json"}
    # Try to load a GitHub token if present
    gh_token = os.environ.get("GITHUB_TOKEN", "")
    if gh_token:
        headers["Authorization"] = f"Bearer {gh_token}"

    for repo in repos:
        try:
            # Get the default branch
            r = requests.get(f"https://api.github.com/repos/{repo}", headers=headers, timeout=10)
            if r.status_code != 200:
                print(f"  Skipping {repo} (status {r.status_code})")
                continue
            branch = r.json().get("default_branch", "main")

            # Get the file tree
            r = requests.get(
                f"https://api.github.com/repos/{repo}/git/trees/{branch}?recursive=1",
                headers=headers, timeout=15
            )
            if r.status_code != 200:
                continue
            tree = r.json().get("tree", [])

            paths = [
                item["path"] for item in tree
                if item["type"] == "blob"
                and Path(item["path"]).suffix in ALLOWED_EXTS
                and "node_modules" not in item["path"]
                and "dist/" not in item["path"]
                and item.get("size", 0) < 80_000
            ][:max_per_repo]

            repo_rows = 0
            for fpath in paths:
                raw_url = f"https://raw.githubusercontent.com/{repo}/{branch}/{fpath}"
                try:
                    rc = requests.get(raw_url, headers=headers, timeout=10)
                    if rc.status_code != 200:
                        continue
                    code     = rc.text
                    features = extract_features(code, fpath)
                    debt     = compute_debt_score(features, fpath)
                    rows.append((list(features.values()), debt))
                    repo_rows += 1
                except Exception:
                    continue
                time.sleep(0.05)

            print(f"  {repo}: {repo_rows} files")
        except Exception as e:
            print(f"  Error with {repo}: {e}")
    return rows


print("="*55)
print(" RepoNexus Debt Scorer — Training Data Collection")
print("="*55)

# Local files
project_root = Path(__file__).parent.parent
print(f"\n[1/2] Scanning local project: {project_root.name}...")
local_rows = collect_local(project_root)
print(f"      Collected {len(local_rows)} local files.")

# GitHub files
print(f"\n[2/2] Fetching files from {len(GITHUB_REPOS)} GitHub repos...")
gh_rows = fetch_github_files(GITHUB_REPOS, max_per_repo=80)
print(f"      Collected {len(gh_rows)} GitHub files.")

all_rows = local_rows + gh_rows
print(f"\nTotal training samples: {len(all_rows)}")

# ════════════════════════════════════════════════════════════
# STEP 3: TRAIN XGBOOST
# ════════════════════════════════════════════════════════════
X_arr = np.array([r[0] for r in all_rows], dtype=float)
y_arr = np.array([r[1] for r in all_rows], dtype=float)

print(f"\nDebt score distribution:")
print(f"  Min: {y_arr.min():.1f}  Max: {y_arr.max():.1f}  Mean: {y_arr.mean():.1f}")
print(f"  Low(<25): {(y_arr<25).sum()}  Medium(25-50): {((y_arr>=25)&(y_arr<50)).sum()}  "
      f"High(50-75): {((y_arr>=50)&(y_arr<75)).sum()}  Critical(>=75): {(y_arr>=75).sum()}")

model = xgb.XGBRegressor(
    n_estimators=300,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=3,
    random_state=42,
    verbosity=0,
)
model.fit(X_arr, y_arr)

preds = model.predict(X_arr)
mae   = float(np.mean(np.abs(preds - y_arr)))
print(f"\nTraining MAE: {mae:.2f} debt-score points")

# ════════════════════════════════════════════════════════════
# STEP 4: SAVE
# ════════════════════════════════════════════════════════════
out_path = Path(__file__).parent / "debt_scorer_model.pkl"
feature_names = list(extract_features("", "").keys())

with open(out_path, "wb") as f:
    pickle.dump({"model": model, "feature_names": feature_names}, f)

print(f"Model saved -> {out_path}")
print("Done!")
