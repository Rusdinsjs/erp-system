import os
import psycopg2

db_url = os.environ.get('DATABASE_URL')
try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'settings';")
    rows = cur.fetchall()
    print("Columns in 'settings':")
    for row in rows:
        print(row)
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
