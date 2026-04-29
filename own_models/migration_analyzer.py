import re

def scan(files: dict[str, str]) -> list[dict]:
    issues = []
    
    # Common risky SQL patterns
    risky_patterns = [
        (r"(?i)\bDROP\s+TABLE\b", "High", "Dropping a table can cause severe data loss and immediate downtime if the app still references it.", "Ensure the application no longer references this table and take a snapshot before dropping."),
        (r"(?i)\bALTER\s+TABLE\s+\w+\s+ADD\s+(?:COLUMN\s+)?\w+(?!\s+.*DEFAULT)", "Medium", "Adding a column without a DEFAULT value or allowing NULL can lock large tables in some SQL engines.", "Add a DEFAULT value or allow the column to be NULL, and backfill data asynchronously."),
        (r"(?i)\bCREATE\s+INDEX\s+(?!CONCURRENTLY)", "Medium", "Creating an index blocks table writes in PostgreSQL unless created CONCURRENTLY.", "Use 'CREATE INDEX CONCURRENTLY' to avoid locking the table during index build."),
        (r"(?i)\bCREATE\s+TABLE\b|\bALTER\s+TABLE\b", "Low", "Database schema modifications detected. Ensure this migration has been reviewed for backward compatibility.", "Run this migration in a staging environment first to verify it does not lock critical production tables.")
    ]
    
    for path, code in files.items():
        # Only process files that look like migrations
        if "alembic" not in path.lower() and "migration" not in path.lower() and not path.endswith(".sql"):
            continue
            
        for pattern, risk, desc, rec in risky_patterns:
            if re.search(pattern, code):
                issues.append({
                    "file": path,
                    "risk_level": risk,
                    "description": desc,
                    "recommendation": rec
                })
                
                
    if not issues:
        issues.append({
            "file": "General Database Architecture",
            "risk_level": "Low",
            "description": "No explicit migration scripts with locking operations were detected in the sampled files. However, always ensure your ORM generates migrations that handle indices concurrently.",
            "recommendation": "Review your auto-generated ORM migrations before applying them to production."
        })
        
    return issues
