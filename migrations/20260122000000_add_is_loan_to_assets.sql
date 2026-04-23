-- Add is_loan flag to assets
-- Only assets with is_loan = true will appear in internal loan selection

ALTER TABLE assets
ADD COLUMN IF NOT EXISTS is_loan BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN assets.is_loan IS 'Flag to indicate if this asset can be loaned internally to employees';

-- Optional: Set some common loanable assets (laptops, cameras, etc.)
-- You can customize this based on your asset categories
-- UPDATE assets SET is_loan = true WHERE category_id IN (
--     SELECT id FROM categories WHERE name IN ('Laptop', 'Camera', 'Projector', 'Tablet')
-- );
