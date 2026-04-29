import sqlite3

db_path = "backend/reponexus.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, status, started_at, repo_id FROM analysis_runs ORDER BY id DESC LIMIT 10")
runs = cursor.fetchall()
print("Recent 10 runs:")
for run in runs:
    print(run)

conn.close()
