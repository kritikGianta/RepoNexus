import ast
import re

def scan_python(content: str, filename: str) -> list[dict]:
    issues = []
    try:
        tree = ast.parse(content)
        defined_functions = set()
        used_names = set()

        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                if not node.name.startswith("__"): # Ignore magic methods
                    defined_functions.add(node.name)
                    # Heuristic: Check for missing docstring
                    if not ast.get_docstring(node):
                        issues.append({
                            "file": filename,
                            "component": f"Function '{node.name}'",
                            "reason": "Missing docstring. Undocumented code increases technical debt and makes maintenance harder.",
                            "safe_to_delete": False
                        })
            elif isinstance(node, ast.Name):
                used_names.add(node.id)
            elif isinstance(node, ast.Attribute):
                used_names.add(node.attr)

        zombies = defined_functions - used_names
        for z in zombies:
            # Check if it's a pytest or FastAPI endpoint heuristically if needed, 
            # but for this deterministic MVP, we just flag it.
            if z.startswith("test_") or "endpoint" in z:
                continue
            issues.append({
                "file": filename,
                "component": f"Function '{z}'",
                "reason": "Defined but never called or referenced in this file.",
                "safe_to_delete": False # Requires manual review for cross-file usage
            })
    except Exception as e:
        pass
    return issues

def scan_js_ts(content: str, filename: str) -> list[dict]:
    issues = []
    # Simplified regex for demo purposes
    # Find definitions: function foo( or const foo =
    defs = re.findall(r'(?:function|const|let|var)\s+([a-zA-Z0-9_]+)\s*(?:=|:\s*[^=]+=\s*)?(?:\([^)]*\)\s*=>|\()', content)
    
    # Find all word tokens
    words = re.findall(r'\b[a-zA-Z0-9_]+\b', content)
    
    # Count occurrences
    word_counts = {}
    for w in words:
        word_counts[w] = word_counts.get(w, 0) + 1

    for d in set(defs):
        # A defined function usually appears exactly once if it's never called or exported
        if word_counts.get(d, 0) == 1 and not d.startswith("test"):
            issues.append({
                "file": filename,
                "component": f"Function/Variable '{d}'",
                "reason": "Defined but seemingly never used in this file.",
                "safe_to_delete": False
            })
    return issues

def scan(files: dict[str, str]) -> list[dict]:
    all_issues = []
    for path, code in files.items():
        if path.endswith(".py"):
            all_issues.extend(scan_python(code, path))
        elif any(path.endswith(ext) for ext in [".js", ".jsx", ".ts", ".tsx"]):
            all_issues.extend(scan_js_ts(code, path))
    
    # If no issues found across files, return empty array
    return all_issues
