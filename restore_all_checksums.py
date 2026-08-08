import glob, hashlib, subprocess

# Compute SHA256 for each file in migrations/
# Version mapping:
# 001_init_schema.sql -> 1
# 002_add_organizations.sql -> 2
# ...
# 20260724200000_seed_launchpad_config.sql -> 20260724200000

for p in glob.glob("migrations/*.sql"):
    filename = p.replace("migrations/", "").replace("migrations\\", "")
    prefix = filename.split("_")[0]
    try:
        ver = int(prefix)
    except ValueError:
        continue

    with open(p, "rb") as f:
        sha = hashlib.sha256(f.read()).hexdigest()

    sql = f"UPDATE _sqlx_migrations SET checksum = decode('{sha}', 'hex') WHERE version = {ver};"
    subprocess.run(
        [
            "wsl", "-d", "archlinux", "docker", "exec", "-i", "-e", "PGPASSWORD=postgres",
            "mgmt-db", "psql", "-U", "postgres", "-d", "management_system"
        ],
        input=sql,
        capture_output=True,
        text=True
    )

print("All migration checksums restored from disk files.")
