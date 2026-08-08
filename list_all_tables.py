import subprocess

sql = """
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_schema NOT IN ('pg_catalog', 'information_schema') 
ORDER BY table_schema, table_name;
"""

res = subprocess.run(
    [
        "wsl", "-d", "archlinux", "docker", "exec", "-e", "PGPASSWORD=postgres", 
        "mgmt-db", "psql", "-U", "postgres", "-d", "management_system", "-c", sql
    ],
    capture_output=True,
    text=True
)

print(res.stdout)
