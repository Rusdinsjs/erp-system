-- Migration: 0036_add_performance_indexes
-- Description: Add missing indexes for performance optimization based on analysis
-- Created: 2026-01-14

-- 1. Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- 2. Assets Indexes
CREATE INDEX IF NOT EXISTS idx_assets_department_id ON assets(department_id);
CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_name ON assets(name);

-- 3. Audit Logs Indexes
-- created_at is frequently used for sorting logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4. Optimization for Search (Trigram Index - Optional but good for LIKE %...%)
-- Requires pg_trgm extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_assets_name_trgm ON assets USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_employees_name_trgm ON employees USING GIN (name gin_trgm_ops);
