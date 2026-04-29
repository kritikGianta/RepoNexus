import sqlite3

db_path = "backend/reponexus.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, status FROM analysis_runs WHERE status IN ('RUNNING', 'QUEUED')")
stuck_runs = cursor.fetchall()

if stuck_runs:
    print(f"Found {len(stuck_runs)} stuck runs: {stuck_runs}")
    cursor.execute('''
        UPDATE analysis_runs 
        SET status = 'FAILED', 
            error_message = 'Analysis run was interrupted by a server restart. Please trigger it again.',
            ended_at = CURRENT_TIMESTAMP
        WHERE status IN ('RUNNING', 'QUEUED')
    ''')
    conn.commit()
    print("Stuck runs have been marked as failed.")
else:
    print("No stuck runs found.")

conn.close()
