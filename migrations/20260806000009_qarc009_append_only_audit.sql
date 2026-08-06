-- QARC-009: Append-only Audit DB Enforcement
--
-- Revokes UPDATE and DELETE permissions on document_audit_trail and audit_logs
-- for the runtime application roles (erpqu_app and app_role).
--
-- This migration runs idempotently using DO blocks.

DO $$
BEGIN
    -- Revoke permissions for erpqu_app if the role exists
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erpqu_app') THEN
        EXECUTE 'REVOKE UPDATE, DELETE ON TABLE document_audit_trail FROM erpqu_app';
        EXECUTE 'REVOKE UPDATE, DELETE ON TABLE audit_logs FROM erpqu_app';
        EXECUTE 'GRANT SELECT, INSERT ON TABLE document_audit_trail TO erpqu_app';
        EXECUTE 'GRANT SELECT, INSERT ON TABLE audit_logs TO erpqu_app';
    END IF;

    -- Revoke permissions for app_role if the role exists
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_role') THEN
        EXECUTE 'REVOKE UPDATE, DELETE ON TABLE document_audit_trail FROM app_role';
        EXECUTE 'REVOKE UPDATE, DELETE ON TABLE audit_logs FROM app_role';
        EXECUTE 'GRANT SELECT, INSERT ON TABLE document_audit_trail TO app_role';
        EXECUTE 'GRANT SELECT, INSERT ON TABLE audit_logs TO app_role';
    END IF;
END $$;
