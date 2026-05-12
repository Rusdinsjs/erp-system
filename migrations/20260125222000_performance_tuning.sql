-- Migration: 20260125222000_performance_tuning
-- Description: Additional performance tuning indexes for optimized dashboard and list loading

-- 1. Faster listing and sorting for Assets
-- The dashboard and main list frequently sort by creation date
CREATE INDEX IF NOT EXISTS idx_assets_created_at_desc ON assets(created_at DESC);

-- 2. Optimized filtering for Assets by status and category
-- Frequently used in the dashboard stats and sidebar filters
CREATE INDEX IF NOT EXISTS idx_assets_status_category_composite ON assets(status, category_id);

-- 3. Work Orders - faster status lookup per asset
-- Speeds up "Maintenance" count in Asset Dashboard
CREATE INDEX IF NOT EXISTS idx_work_orders_asset_status_composite ON maintenance_work_orders(asset_id, status);

-- 4. Rentals - faster status checks
-- Speeds up "Rent Out" count in Asset Dashboard
CREATE INDEX IF NOT EXISTS idx_rental_items_asset_status_composite ON rental_items(asset_id, status);

-- 5. Audit Logs - faster lookup for specific records
-- Speeds up the "Lifecycle/History" tab for individual assets
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id_created_at ON audit_logs(record_id, created_at DESC);
