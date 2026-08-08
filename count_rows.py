import subprocess

schemas_tables = [
    ('public', 'assets'), ('public', 'users'), ('public', 'categories'), 
    ('public', 'departments'), ('public', 'organizations'), ('public', 'work_orders'),
    ('public', 'loans'), ('public', 'chart_of_accounts'), ('public', 'journal_entries'),
    ('hr', 'employees'), ('crm', 'clients'), ('crm', 'vendors'),
    ('rental', 'rentals'), ('inventory', 'inventory_items')
]

queries = []
for schema, table in schemas_tables:
    queries.append(f"SELECT '{schema}.{table}' as tbl, COUNT(*) as cnt FROM {schema}.{table}")

sql_queries = " UNION ALL ".join(queries) + ";"

res = subprocess.run(
    [
        "wsl", "-d", "archlinux", "docker", "exec", "-e", "PGPASSWORD=postgres", 
        "mgmt-db", "psql", "-U", "postgres", "-d", "management_system", "-c", sql_queries
    ],
    capture_output=True,
    text=True
)

print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
