import sqlite3
import json

def fetch_analysis():
    conn = sqlite3.connect('d:/hackathon/backend/data/abm.db')
    cursor = conn.cursor()
    cursor.execute("SELECT result_json FROM analysis_sessions WHERE result_json IS NOT NULL LIMIT 1")
    row = cursor.fetchone()
    if row:
        print(json.dumps(json.loads(row[0]), indent=2))
    else:
        print("No result_json found")
    conn.close()

if __name__ == "__main__":
    fetch_analysis()
