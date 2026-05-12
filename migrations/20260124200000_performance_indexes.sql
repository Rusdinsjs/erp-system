-- Migration: 20260124200000_performance_indexes
-- Description: Add missing indexes for frequent query patterns (Filtering, Foreign Keys)

-- 1. Assets Filtering
-- Used in Asset List with filters
CREATE INDEX IF NOT EXISTS idx_assets_category_status ON assets(category_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_location_status ON assets(location_id, status);

-- 2. Maintenance Lookups
-- Used for "Active Work Orders" or "Maintenance History"
CREATE INDEX IF NOT EXISTS idx_maintenance_asset_status ON maintenance_records(asset_id, status);

-- 3. Audit Logs Entity Search
-- Used for "View History" of a specific asset/user
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(record_id); 
-- Note: 'table_name' is usually low cardinality, but (table_name, record_id) is redundant if record_id is UUID (globally unique usually, or high enough cardinality).
-- However, we previously had `idx_audit_table_record`. Let's check `idx_audit_table_record` exists (it does in init schema).
-- We will add an index on `action` for filtering logs by type (e.g. "Who DELETED this?")
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- 4. Notifications
-- Used for "Count Unread"
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;

-- 5. Foreign Keys that might be missing
CREATE INDEX IF NOT EXISTS idx_rentals_client ON rentals(client_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
