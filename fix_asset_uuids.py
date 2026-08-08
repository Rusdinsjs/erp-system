import subprocess

with open("erpqu_backup_latest.sql", "r", encoding="utf-8", errors="ignore") as f:
    sql_text = f.read()

# Disable constraints and restore exact assets table from backup
script = """
SET session_replication_role = 'replica';
DELETE FROM asset_documents;
DELETE FROM vehicle_details;
DELETE FROM heavy_equipment_details;
DELETE FROM assets;
""" + sql_text + """
SET session_replication_role = 'origin';
"""

res = subprocess.run(
    [
        "wsl", "-d", "archlinux", "docker", "exec", "-i", "-e", "PGPASSWORD=postgres", 
        "mgmt-db", "psql", "-U", "postgres", "-d", "management_system"
    ],
    input=script,
    capture_output=True,
    text=True
)

print("Asset table clean reload finished.")

# Sync with hr/crm/rental/inventory schemas if needed
subprocess.run(["python", "sync_schemas.py"])
