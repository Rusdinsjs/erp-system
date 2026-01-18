-- Migration: 045_fix_orphan_rental_asset
-- Description: Reset status of AST-FRN-002 from rented_out to in_inventory due to missing rental record
-- Created: 2026-01-18

UPDATE assets 
SET status = 'in_inventory', updated_at = NOW()
WHERE asset_code = 'AST-FRN-002' AND status = 'rented_out';
