import subprocess

sql = """
SELECT 
    schemaname, 
    relname as table_name, 
    n_live_tup as row_count 
FROM pg_stat_user_tables 
WHERE n_live_tup > 0
ORDER BY schemaname, relname;
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
