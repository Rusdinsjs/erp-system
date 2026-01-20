-- Add rental_item_id to rental_billing_periods
ALTER TABLE rental_billing_periods 
ADD COLUMN IF NOT EXISTS rental_item_id UUID REFERENCES rental_items(id) ON DELETE CASCADE;

-- Populate rental_item_id for existing records
-- Assuming 1-to-1 mapping for existing data (migrated via prev migration)
UPDATE rental_billing_periods rbp
SET rental_item_id = (
    SELECT id FROM rental_items ri 
    WHERE ri.rental_id = rbp.rental_id 
    LIMIT 1
)
WHERE rental_item_id IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_rbp_rental_item ON rental_billing_periods(rental_item_id);
