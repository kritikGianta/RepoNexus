import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from debt_scorer import score_files

test_files = {}
threatlens = Path(__file__).parent.parent / "ThreatLens_Test"
for p in threatlens.rglob("*"):
    if p.suffix in {".py", ".js", ".ts", ".tsx", ".jsx"} and "__pycache__" not in str(p):
        try:
            test_files[str(p.name)] = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            pass

print(f"Testing {len(test_files)} ThreatLens files...\n")
results = score_files(test_files)
for r in results:
    print(f"{r['severity']:<12} score={r['debt_score']:5.1f}  {r['file']}")

scores = [r["debt_score"] for r in results]
if scores:
    print(f"\nMin: {min(scores):.1f}  Max: {max(scores):.1f}  Mean: {sum(scores)/len(scores):.1f}")
