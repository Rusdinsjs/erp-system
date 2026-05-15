-- Migration: 046_add_photos_to_assets
-- Description: Add photos field to assets table to store multi-side photos
-- Created: 2026-05-15

ALTER TABLE assets ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '{}'::jsonb;
