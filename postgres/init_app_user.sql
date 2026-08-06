-- ================================================================
-- Least-Privilege Application Role Setup (QSEC-011)
-- ================================================================
-- Executed on database bootstrap to create a non-superuser application
-- role for normal API database access.
-- ================================================================

-- Create non-superuser application role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'erpqu_app') THEN
        CREATE ROLE erpqu_app WITH LOGIN PASSWORD 'change_this_app_password_in_prod';
    END IF;
END
$$;

-- Grant minimal necessary schema permissions to application role
GRANT CONNECT ON DATABASE management_system TO erpqu_app;
GRANT USAGE ON SCHEMA public TO erpqu_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO erpqu_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO erpqu_app;

-- Ensure future tables created by migrations automatically grant permissions to erpqu_app
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erpqu_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO erpqu_app;

-- Revoke dangerous superuser / DDL administrative privileges from application role
ALTER ROLE erpqu_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
