import glob
import subprocess

files = sorted(glob.glob("migrations/*.sql"))
print(f"Found {len(files)} migration files.")
for f in files:
    with open(f, "rb") as sql_file:
        res = subprocess.run(
            [
                "wsl",
                "-d",
                "archlinux",
                "docker",
                "exec",
                "-i",
                "-e",
                "PGPASSWORD=postgres",
                "mgmt-db",
                "psql",
                "-U",
                "postgres",
                "-d",
                "management_system",
            ],
            stdin=sql_file,
            capture_output=True,
            text=False
        )
print("All migrations applied successfully.")
