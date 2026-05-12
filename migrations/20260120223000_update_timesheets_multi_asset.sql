-- Migration: Update Timesheets for Multi-Asset Rental Refactor
-- Link rental_timesheets to rental_items instead of rentals

-- 1. Add rental_item_id to rental_timesheets
ALTER TABLE rental_timesheets ADD COLUMN IF NOT EXISTS rental_item_id UUID REFERENCES rental_items(id) ON DELETE CASCADE;

-- 2. Populate rental_item_id
-- We assume 1-to-1 mapping for existing data (rental_id in timesheet matches rental_id in rental_item)
UPDATE rental_timesheets rt
SET rental_item_id = ri.id
FROM rental_items ri
WHERE rt.rental_id = ri.rental_id;

-- 3. Validation (Optional: Check for nulls)
-- SELECT count(*) FROM rental_timesheets WHERE rental_item_id IS NULL;

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_rental_timesheets_item ON rental_timesheets(rental_item_id);

-- 5. We keep rental_id as foreign key for easier filtering by Rental Agreement?
-- Or should we drop it?
-- Ideally, we keep it for performance or drop it for normalization.
-- Let's keep it for now but it's redundant.
-- For now, Timesheets are per Item.
