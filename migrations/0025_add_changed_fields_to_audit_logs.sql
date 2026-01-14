-- Migration: 0025_add_changed_fields_to_audit_logs
-- Description: Add missing changed_fields column required by audit triggers
-- Created: 2026-01-13

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_fields TEXT[];
