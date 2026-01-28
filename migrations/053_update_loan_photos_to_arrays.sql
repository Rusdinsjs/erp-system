-- Migration: 053_update_loan_photos_to_arrays
-- Description: Convert handover_photo and return_photo to arrays to support multiple photos
-- Created: 2026-01-28 15:00:00

-- Add new array columns
ALTER TABLE asset_loans ADD COLUMN IF NOT EXISTS check_out_photos TEXT[];
ALTER TABLE asset_loans ADD COLUMN IF NOT EXISTS return_photos TEXT[];

-- Migrate existing data safely (if columns exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_loans' AND column_name = 'handover_photo') THEN
        UPDATE asset_loans SET check_out_photos = ARRAY[handover_photo] WHERE handover_photo IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'asset_loans' AND column_name = 'return_photo') THEN
        UPDATE asset_loans SET return_photos = ARRAY[return_photo] WHERE return_photo IS NOT NULL;
    END IF;
END $$;

-- Drop old columns
ALTER TABLE asset_loans DROP COLUMN IF EXISTS handover_photo;
ALTER TABLE asset_loans DROP COLUMN IF EXISTS return_photo;
