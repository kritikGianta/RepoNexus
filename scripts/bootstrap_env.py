#!/usr/bin/env python3
"""Create backend/.env from the template with freshly generated secrets.

Usage: python scripts/bootstrap_env.py [--force]
Existing files are left untouched unless --force is given.
"""

from __future__ import annotations

import base64
import os
import secrets
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "backend" / ".env.example"
TARGET = ROOT / "backend" / ".env"


def main() -> int:
    if TARGET.exists() and "--force" not in sys.argv:
        print(f"{TARGET} already exists (use --force to regenerate).")
        return 0

    fernet_key = base64.urlsafe_b64encode(os.urandom(32)).decode()
    replacements = {
        "JWT_SECRET": secrets.token_hex(32),
        "ENCRYPTION_KEY": fernet_key,
    }
    lines = []
    for line in TEMPLATE.read_text(encoding="utf-8").splitlines():
        key = line.split("=", 1)[0]
        lines.append(f"{key}={replacements[key]}" if key in replacements and "=" in line else line)
    TARGET.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {TARGET} with generated JWT_SECRET and ENCRYPTION_KEY.")
    print("Next: add GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET and GROQ_API_KEY.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
