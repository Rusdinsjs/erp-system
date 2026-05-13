import os
import psycopg2

db_url = os.environ.get('DATABASE_URL')
if not db_url:
    print("DATABASE_URL not set")
    exit(1)

try:
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT id, username FROM users;")
    rows = cur.fetchall()
    print("Users:")
    for row in rows:
        print(row)
    
    cur.execute("SELECT key, value FROM settings;")
    rows = cur.fetchall()
    print("\nSettings:")
    for row in rows:
        print(row)
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
