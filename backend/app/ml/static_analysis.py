from __future__ import annotations

import subprocess
import tempfile
from pathlib import Path


class StaticAnalyzer:
    def analyze_python(self, path: str, content: str) -> list[dict]:
        extension = Path(path).suffix.lower()
        if extension != ".py":
            return []

        issues: list[dict] = []
        with tempfile.TemporaryDirectory(prefix="reponexus-static-") as tmp:
            file_path = Path(tmp) / "target.py"
            file_path.write_text(content, encoding="utf-8")

            issues.extend(self._run_pylint(file_path))
            issues.extend(self._run_flake8(file_path))

        return issues

    def _run_pylint(self, file_path: Path) -> list[dict]:
        command = [
            "pylint",
            str(file_path),
            "--output-format=json",
            "--score=n",
            "--disable=all",
            "--enable=W0611,W0612,W0613,W1203,W1514,C0103,C0114,C0115,C0116,R1702,R0915",
        ]
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=30, check=False)
        except (FileNotFoundError, OSError, subprocess.SubprocessError):
            return []

        stdout = result.stdout.strip()
        if not stdout:
            return []

        try:
            import json

            payload = json.loads(stdout)
        except Exception:
            return []

        parsed = []
        for issue in payload:
            parsed.append(
                {
                    "tool": "pylint",
                    "line": int(issue.get("line", 1)),
                    "symbol": issue.get("symbol", "unknown"),
                    "message": issue.get("message", ""),
                    "type": issue.get("type", "warning"),
                }
            )
        return parsed

    def _run_flake8(self, file_path: Path) -> list[dict]:
        command = [
            "flake8",
            str(file_path),
            "--format=%(row)d|%(code)s|%(text)s",
        ]
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=20, check=False)
        except (FileNotFoundError, OSError, subprocess.SubprocessError):
            return []

        lines = [line.strip() for line in result.stdout.splitlines() if line.strip()]

        parsed = []
        for line in lines:
            parts = line.split("|", maxsplit=2)
            if len(parts) != 3:
                continue
            parsed.append(
                {
                    "tool": "flake8",
                    "line": int(parts[0]),
                    "symbol": parts[1],
                    "message": parts[2],
                    "type": "warning",
                }
            )
        return parsed
