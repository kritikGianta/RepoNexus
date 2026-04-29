import re
import ast

def scan_python(content: str, filename: str) -> list[dict]:
    issues = []
    try:
        tree = ast.parse(content)
        
        # Walk through the AST to find 'For' or 'While' loops
        for node in ast.walk(tree):
            if isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
                # Now check inside the loop body for any Call nodes that look like DB queries
                for child in ast.walk(node):
                    if isinstance(child, ast.Call):
                        func = child.func
                        func_name = ""
                        if isinstance(func, ast.Name):
                            func_name = func.id
                        elif isinstance(func, ast.Attribute):
                            func_name = func.attr
                            
                        db_calls = ["execute", "fetch", "filter", "all", "get", "query", "find", "append", "push", "read"]
                        if func_name in db_calls or "db" in func_name.lower():
                            issues.append({
                                "file": filename,
                                "issue_type": "Loop Optimization / N+1 Risk",
                                "description": f"Found function call '{func_name}' inside a loop. If this makes a database query or network request, it causes severe performance issues (N+1 queries).",
                                "optimized_code": "# Use IN clause or pre-fetch data before the loop, or batch your operations."
                            })
                            break
    except Exception:
        pass
    return issues

def scan_js_ts(content: str, filename: str) -> list[dict]:
    issues = []
    # Very simplistic regex heuristic for JS/TS
    # Look for a loop structure containing await db. or something similar
    loop_pattern = r'(?:for|while)\s*\([^)]*\)\s*\{([^}]*)\}'
    loops = re.finditer(loop_pattern, content, re.MULTILINE)
    
    for match in loops:
        body = match.group(1)
        if re.search(r'(?:await\s+)?(?:db\.|prisma\.|session\.|mongoose\.|api\.|fetch)[a-zA-Z]*\(', body):
            issues.append({
                "file": filename,
                "issue_type": "Loop Optimization / N+1 Risk",
                "description": "Found a database or API call inside a for/while loop. This causes N+1 query problems which degrade performance and increase cloud costs.",
                "optimized_code": "// Fetch all required data before the loop using an IN query, batching, or Promise.all."
            })
    return issues

def scan(files: dict[str, str]) -> list[dict]:
    all_issues = []
    for path, code in files.items():
        if path.endswith(".py"):
            all_issues.extend(scan_python(code, path))
        elif any(path.endswith(ext) for ext in [".js", ".jsx", ".ts", ".tsx"]):
            all_issues.extend(scan_js_ts(code, path))
    if not all_issues:
        all_issues.append({
            "file": "General Codebase",
            "issue_type": "Data Fetching Strategy",
            "description": "No explicit N+1 loops were detected in the sampled files. However, ensure that any lists or grids rendered on the frontend are powered by paginated and batched backend queries.",
            "optimized_code": "# Use DataLoader pattern in GraphQL or .in_() clauses in SQL to batch fetch related entities."
        })
        
    return all_issues
