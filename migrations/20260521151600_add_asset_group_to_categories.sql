-- Add asset_group column to categories table for Role-Based Access Control (RBAC)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS asset_group VARCHAR(50);

-- Map existing categories to ALAT_BERAT
UPDATE categories 
SET asset_group = 'ALAT_BERAT' 
WHERE code LIKE 'INTI-ALAT-BERAT%' OR name ILIKE '%alat berat%' OR name ILIKE '%excavator%' OR name ILIKE '%dozer%';

-- Map existing categories to KENDARAAN
UPDATE categories 
SET asset_group = 'KENDARAAN' 
WHERE code LIKE 'VEHICLE%' 
   OR code LIKE 'INTI-TRUCK%' 
   OR code LIKE 'INTI-RINGAN%'
   OR name ILIKE '%kendaraan%'
   OR name ILIKE '%dump truck%'
   OR name ILIKE '%truk%';

-- Map existing categories to INFRASTRUKTUR
UPDATE categories 
SET asset_group = 'INFRASTRUKTUR' 
WHERE code LIKE 'BUILDING%' 
   OR code LIKE 'FURNITURE%' 
   OR code LIKE 'MACHINERY%' 
   OR code LIKE 'IT-EQUIP%' 
   OR code LIKE 'OPS-BENGKEL%' 
   OR code LIKE 'OPS-KANTOR%' 
   OR code LIKE 'ASSET-INFRA%'
   OR name ILIKE '%bangunan%'
   OR name ILIKE '%infrastruktur%';
