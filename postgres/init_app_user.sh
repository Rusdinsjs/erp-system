#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${DB_APP_USER:?DB_APP_USER is required}"
: "${DB_APP_PASSWORD:?DB_APP_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  --set=app_user="$DB_APP_USER" \
  --set=app_password="$DB_APP_PASSWORD" <<'EOSQL'
SELECT format(
  'CREATE ROLE %I LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION',
  :'app_user', :'app_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'app_user') \gexec

SELECT format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), :'app_user') \gexec
SELECT format('GRANT USAGE ON SCHEMA public TO %I', :'app_user') \gexec

-- Existing volumes already contain tables created before this role existed.
-- Grant the runtime DML it needs without requiring the application to run as
-- the migration/superuser role.
SELECT format(
  'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO %I',
  :'app_user'
) \gexec
SELECT format(
  'GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO %I',
  :'app_user'
) \gexec

-- Migrations run later as POSTGRES_USER. These defaults make their newly-created
-- tables/sequences usable by the runtime role without granting DDL privileges.
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO %I',
  :'app_user'
) \gexec
SELECT format(
  'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO %I',
  :'app_user'
) \gexec

-- Re-applying this bootstrap to an existing volume must not undo the audit
-- append-only invariant even when the audit migration already ran earlier.
SELECT format('REVOKE UPDATE, DELETE ON TABLE audit_trail FROM %I', :'app_user')
WHERE to_regclass('public.audit_trail') IS NOT NULL \gexec
SELECT format('REVOKE UPDATE, DELETE ON TABLE immutable_audit_records FROM %I', :'app_user')
WHERE to_regclass('public.immutable_audit_records') IS NOT NULL \gexec
EOSQL
