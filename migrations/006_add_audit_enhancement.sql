-- Migration: 006_add_audit_enhancement
-- Description: Enhanced audit logging
-- Created: 2026-01-07

-- Enhanced audit logs table (if not exists from init migration)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_fields TEXT[],
    user_id UUID REFERENCES users(id),
    user_email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

-- Partitioning function for audit logs (optional, for high-volume systems)
-- This creates monthly partitions
-- CREATE TABLE audit_logs_y2026m01 PARTITION OF audit_logs
--     FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Function to automatically log changes
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed TEXT[];
    key TEXT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        old_data = to_jsonb(OLD);
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, current_setting('app.current_user_id', true)::uuid);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
        -- Find changed fields
        FOR key IN SELECT jsonb_object_keys(old_data)
        LOOP
            IF old_data->key IS DISTINCT FROM new_data->key THEN
                changed = array_append(changed, key);
            END IF;
        END LOOP;
        -- Only log if something changed
        IF array_length(changed, 1) > 0 THEN
            INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_fields, user_id)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', old_data, new_data, changed, current_setting('app.current_user_id', true)::uuid);
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        new_data = to_jsonb(NEW);
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', new_data, current_setting('app.current_user_id', true)::uuid);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to key tables
DROP TRIGGER IF EXISTS audit_assets ON assets;
CREATE TRIGGER audit_assets
    AFTER INSERT OR UPDATE OR DELETE ON assets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_asset_loans ON asset_loans;
CREATE TRIGGER audit_asset_loans
    AFTER INSERT OR UPDATE OR DELETE ON asset_loans
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_maintenance_work_orders ON maintenance_work_orders;
CREATE TRIGGER audit_maintenance_work_orders
    AFTER INSERT OR UPDATE OR DELETE ON maintenance_work_orders
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
