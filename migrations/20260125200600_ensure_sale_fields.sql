-- Migration: 20260125200600_ensure_sale_fields
-- Description: Ensure asset sale fields exist (forcing run if 051 was skipped/corrupt)

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS sale_price DECIMAL(20, 4),
ADD COLUMN IF NOT EXISTS sale_date DATE,
ADD COLUMN IF NOT EXISTS sold_to VARCHAR(255);
