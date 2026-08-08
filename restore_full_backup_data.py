import subprocess

with open("erpqu_backup_latest.sql", "r", encoding="utf-8", errors="ignore") as f:
    sql_content = f.read()

# Disable triggers & FKs during restore
restore_script = "SET session_replication_role = 'replica';\n" + sql_content + "\nSET session_replication_role = 'origin';\n"

res = subprocess.run(
    [
        "wsl", "-d", "archlinux", "docker", "exec", "-i", "-e", "PGPASSWORD=postgres", 
        "mgmt-db", "psql", "-U", "postgres", "-d", "management_system"
    ],
    input=restore_script,
    capture_output=True,
    text=True
)

print("Full backup data restore finished.")
if "COPY" in res.stdout:
    print("COPY results found in stdout.")
