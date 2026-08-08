import glob
import subprocess

seed_files = sorted([f for f in glob.glob("migrations/*.sql") if "seed" in f or "demo" in f or "sample" in f or "011" in f])
print(f"Found {len(seed_files)} seed files:")
for f in seed_files:
    print(f"Executing {f}...")
    with open(f, "rb") as sql_file:
        res = subprocess.run(
            [
                "wsl", "-d", "archlinux", "docker", "exec", "-i", "-e", "PGPASSWORD=postgres", 
                "mgmt-db", "psql", "-U", "postgres", "-d", "management_system"
            ],
            stdin=sql_file,
            capture_output=True,
            text=True
        )
        if res.stderr and "ERROR" in res.stderr:
            print(f"  Warning/Error in {f}: {res.stderr[:200]}")

print("All seed files executed.")
