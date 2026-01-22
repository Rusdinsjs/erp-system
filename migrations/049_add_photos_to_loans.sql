-- Migration: 049_add_photos_to_loans
-- Description: Add handover and return photos to asset loans
-- Created: 2026-01-22

ALTER TABLE asset_loans 
ADD COLUMN IF NOT EXISTS handover_photo VARCHAR(500),
ADD COLUMN IF NOT EXISTS return_photo VARCHAR(500);
