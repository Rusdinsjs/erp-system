import subprocess

with open("erpqu_backup_latest.sql", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

copy_lines = []
recording = False
for line in lines:
    if "COPY public.asset_documents" in line:
        recording = True
    if recording:
        copy_lines.append(line)
        if line.strip() == "\\.":
            break

sql_text = "".join(copy_lines)
print(f"Extracted {len(copy_lines)} lines for asset_documents.")

res = subprocess.run(
    [
        "wsl", "-d", "archlinux", "docker", "exec", "-i", "-e", "PGPASSWORD=postgres", 
        "mgmt-db", "psql", "-U", "postgres", "-d", "management_system"
    ],
    input=sql_text,
    capture_output=True,
    text=True
)

print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
