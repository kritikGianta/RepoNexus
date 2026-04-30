import re
from pathlib import Path

class StaticAnalyzer:
    def analyze_python(self, path: str, content: str) -> list[dict]:
        extension = Path(path).suffix.lower()
        if extension != ".py":
            return []

        issues: list[dict] = []
        lines = content.splitlines()

        # 1. Simple regex-based Unused Import detection (Heuristic)
        # Find all 'import x' or 'from x import y'
        import_pattern = re.compile(r'^\s*(?:import|from)\s+([a-zA-Z0-9_]+)', re.MULTILINE)
        imports = import_pattern.findall(content)
        
        for imp in set(imports):
            # Check if the import name appears elsewhere in the file (excluding the import line itself)
            # This is a basic heuristic but uses 0 subprocesses.
            usage_count = len(re.findall(r'\b' + re.escape(imp) + r'\b', content))
            if usage_count <= 1: # Only appears in the import line
                issues.append({
                    "tool": "lightweight-static",
                    "line": 1,
                    "symbol": "unused-import",
                    "message": f"Module '{imp}' is imported but seemingly unused.",
                    "type": "warning"
                })

        # 2. Check for common 'dirty' patterns
        for i, line in enumerate(lines, start=1):
            if "print(" in line and not line.strip().startswith("#"):
                issues.append({
                    "tool": "lightweight-static",
                    "line": i,
                    "symbol": "debug-print",
                    "message": "Production code should use logging instead of print().",
                    "type": "warning"
                })

        return issues
