import sys
import json
import asyncio
from pathlib import Path

# Add backend directory to sys path so we can import modules if needed
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

import own_models.security_scanner as sec
import own_models.debt_scorer as debt
import own_models.migration_analyzer as mig

def test():
    print("Testing Security Scanner...")
    # Simulate an env file with secrets
    env_content = "GITHUB_PAT=ghp_123456789012345678901234567890123456\nSECRET_KEY=12345678901234567890123456789012"
    issues = json.loads(sec.scan(env_content, ".env"))
    print(f"Env file issues: {issues}")
    
    # Simulate a py file with secrets
    py_content = "api_key = 'sk-123456789012345678901234567890123456'\n"
    issues = json.loads(sec.scan(py_content, "test.py"))
    print(f"Py file issues: {issues}")

    print("\nTesting Debt Scorer...")
    test_files = {"test.py": "print('hello world')\n" * 5}
    debt_issues = debt.score_files(test_files)
    print(f"Debt scorer issues: {debt_issues}")

if __name__ == "__main__":
    test()
