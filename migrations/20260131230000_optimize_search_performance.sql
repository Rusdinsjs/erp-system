-- Migration: 20260131230000_optimize_search_performance
-- Description: Enable pg_trgm for fuzzy search and add missing FK indexes

-- 1. Enable pg_trgm extension for GIN indexes on text columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Add GIN indexes for efficient ILIKE '%term%' search
-- Assets
CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_code_trgm ON assets USING GIN (asset_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_serial_trgm ON assets USING GIN (serial_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_brand_trgm ON assets USING GIN (brand gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_model_trgm ON assets USING GIN (model gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_assets_notes_trgm ON assets USING GIN (notes gin_trgm_ops);

-- Users (for searching assigned to)
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);

-- 3. Add missing Foreign Key indexes to speed up JOINS
CREATE INDEX IF NOT EXISTS idx_assets_department ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_assigned_to ON assets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assets_vendor ON assets(vendor_id);
