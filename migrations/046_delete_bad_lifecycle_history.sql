-- Migration: 046_delete_bad_lifecycle_history
-- Description: Delete specific erroneous lifecycle history record for AST-FRN-002
-- Created: 2026-01-18

DELETE FROM asset_history
WHERE asset_id = (SELECT id FROM assets WHERE asset_code = 'AST-FRN-002')
  AND notes = 'Di sewa PT. Petrosea';
