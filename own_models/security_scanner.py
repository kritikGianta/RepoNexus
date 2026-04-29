import re

# Patterns that indicate a real secret value embedded in code
SECRET_PATTERNS = [
    (r"['\"]([a-zA-Z0-9]{32,})['\"]",                            "Potential Hardcoded Secret"),
    (r"['\"]sk-[a-zA-Z0-9]{32,}['\"]",                          "OpenAI API Key"),
    (r"['\"]ghp_[a-zA-Z0-9]{36,}['\"]",                         "GitHub PAT"),
    (r"['\"]AKIA[0-9A-Z]{16}['\"]",                              "AWS Access Key"),
]

# Patterns that are only Medium severity
MEDIUM_PATTERNS = [
    (r"(?i)\bTODO\b|\bFIXME\b",                                  "Unresolved TODO/FIXME"),
    (r"['\"]http://(?!localhost)[a-zA-Z0-9.-]+",                  "Insecure HTTP URL"),
]

IGNORE_TERMS = ["YOUR_", "EXAMPLE", "PLACEHOLDER", "<", "xxx", "***", "..."]


def _is_false_positive(match_str: str) -> bool:
    upper = match_str.upper()
    return any(t.upper() in upper for t in IGNORE_TERMS)


def scan(config_content: str, filename: str = "") -> str:
    import json
    issues = []
    is_env_file = any(filename.endswith(ext) for ext in [".env", ".env.example", ".env.local"])

    lines = config_content.split("\n")
    seen = set()

    for i, line in enumerate(lines):
        # Skip comment lines
        stripped = line.strip()
        if stripped.startswith("#") or stripped.startswith("//"):
            continue

        # High severity: real secrets in source code files (not .env)
        if not is_env_file:
            for pattern, desc in SECRET_PATTERNS:
                match = re.search(pattern, line)
                if match and not _is_false_positive(match.group(0)):
                    key = (desc, i)
                    if key not in seen:
                        seen.add(key)
                        issues.append({
                            "severity": "High",
                            "file": filename or "Source File",
                            "issue": f"{desc} detected in source code (line {i+1})",
                            "fix": "Move secrets to environment variables. Never commit credentials to source control."
                        })

        # Medium severity: technical debt markers and insecure URLs
        for pattern, desc in MEDIUM_PATTERNS:
            match = re.search(pattern, line)
            if match and not _is_false_positive(match.group(0)):
                key = desc
                if key not in seen:
                    seen.add(key)
                    issues.append({
                        "severity": "Medium",
                        "file": filename or "Source File",
                        "issue": f"{desc} found",
                        "fix": "Resolve TODOs before merging to main. Use HTTPS for all external URLs."
                    })

    # Dependency audit hint if package.json present
    if "dependencies" in config_content:
        if '"axios"' in config_content and '"0.21.1"' in config_content:
            issues.append({
                "severity": "High",
                "file": "package.json",
                "issue": "Outdated Axios 0.21.1 — SSRF vulnerability (CVE-2020-28168)",
                "fix": "Upgrade to axios@0.21.2 or higher."
            })

    # Generic catch-all if nothing was found
    if not issues:
        issues.append({
            "severity": "Low",
            "file": "Project Configuration",
            "issue": "No critical vulnerabilities detected. Periodic review recommended.",
            "fix": "Run 'npm audit' or 'pip-audit' periodically to check for transitive CVEs."
        })

    return json.dumps(issues)
