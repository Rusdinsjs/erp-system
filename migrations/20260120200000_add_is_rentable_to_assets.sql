-- Add is_rentable flag to assets
-- Only assets with is_rentable = true will appear in rental asset selection

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS is_rentable BOOLEAN DEFAULT false;

-- Set existing heavy equipment categories as rentable by default
-- This is optional - you may want to manually set which assets are rentable
COMMENT ON COLUMN assets.is_rentable IS 'Flag to indicate if this asset can be rented out';
