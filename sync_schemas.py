import subprocess

tables_map = [
    ("hr", "employees"),
    ("hr", "attendance_records"),
    ("hr", "face_photos"),
    ("hr", "work_experiences"),
    ("hr", "employee_evaluations"),
    ("hr", "leave_requests"),
    ("crm", "vendors"),
    ("crm", "clients"),
    ("crm", "companies"),
    ("rental", "rentals"),
    ("rental", "rental_contracts"),
    ("rental", "rental_billings"),
    ("rental", "rental_timesheets"),
    ("rental", "contract_approvals"),
    ("rental", "contract_documents"),
    ("rental", "contract_renewals"),
    ("rental", "contract_templates"),
    ("inventory", "inventory_categories"),
    ("inventory", "inventory_items"),
    ("inventory", "inventory_movements"),
    ("inventory", "inventory_documents"),
]

sql_statements = []
for schema, table in tables_map:
    sql_statements.append(f"""
    DO $$
    BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '{table}') AND
           EXISTS (SELECT FROM information_schema.tables WHERE table_schema = '{schema}' AND table_name = '{table}') THEN
            EXECUTE 'INSERT INTO {schema}.{table} SELECT * FROM public.{table} ON CONFLICT DO NOTHING';
        END IF;
    END $$;
    """)

full_sql = "\n".join(sql_statements)

res = subprocess.run(
    [
        "wsl", "-d", "archlinux", "docker", "exec", "-i", "-e", "PGPASSWORD=postgres", 
        "mgmt-db", "psql", "-U", "postgres", "-d", "management_system"
    ],
    input=full_sql,
    capture_output=True,
    text=True
)

print(res.stdout)
if res.stderr:
    print("STDERR:", res.stderr)
