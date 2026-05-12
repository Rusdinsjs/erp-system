-- Migration: 051_add_asset_sale_fields
-- Description: Add fields to track asset sale details

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(20, 4),
ADD COLUMN IF NOT EXISTS sale_date DATE,
ADD COLUMN IF NOT EXISTS sold_to VARCHAR(255);
