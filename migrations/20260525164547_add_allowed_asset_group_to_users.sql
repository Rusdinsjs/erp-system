-- Migration: 20260525164547_add_allowed_asset_group_to_users
-- Description: Add allowed_asset_group to users table for dynamic RBAC

ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_asset_group VARCHAR(50);
