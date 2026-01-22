-- Migration: 050_add_is_fuel_to_assets
-- Description: Add is_fuel flag to assets for fuel request filtering
-- Date: 2026-01-22

-- Add is_fuel column
ALTER TABLE assets ADD COLUMN IF NOT EXISTS is_fuel BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assets_is_fuel ON assets(is_fuel);

-- Seed is_fuel = true for known fuel-consuming categories
-- 1. Heavy Equipment
-- 2. Dump Truck
-- 3. Operational Vehicles
UPDATE assets 
SET is_fuel = TRUE 
WHERE category_id IN (
    '44444444-4444-4444-4444-444444444431', -- Alat Berat
    '44444444-4444-4444-4444-444444444441', -- Dump Truck
    '44444444-4444-4444-4444-444444444442'  -- Kendaraan Operasional
);

-- Also check for names if IDs are different in some environments
UPDATE assets
SET is_fuel = TRUE
WHERE category_id IN (
    SELECT id FROM categories 
    WHERE name ILIKE '%Vehicle%' 
       OR name ILIKE '%Heavy Equipment%' 
       OR name ILIKE '%Truck%'
       OR name ILIKE '%Alat Berat%'
       OR name ILIKE '%Kendaraan%'
);
