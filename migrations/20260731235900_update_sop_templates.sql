-- Migration: Add versioning, parent_id, and usage analytics to maintenance_templates

ALTER TABLE maintenance_templates
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES maintenance_templates(id),
    ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Ensure indexes for category and versioning
CREATE INDEX IF NOT EXISTS idx_maintenance_templates_is_active ON maintenance_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_maintenance_templates_parent_id ON maintenance_templates(parent_id);
