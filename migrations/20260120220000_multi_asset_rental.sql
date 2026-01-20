-- Migration: Multi-Asset Rental Refactor
-- Split rentals table into rentals (header) and rental_items (details)

-- 1. Create rental_items table
CREATE TABLE IF NOT EXISTS rental_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    rental_rate_id UUID REFERENCES rental_rates(id) ON DELETE SET NULL,
    
    -- Snapshot of rate info
    rate_amount DECIMAL(15,2),
    rate_basis VARCHAR(20), -- hourly, daily, bcm, etc.
    
    -- Status per item (requested, approved, rented_out, returned, etc)
    status VARCHAR(30) NOT NULL DEFAULT 'requested',
    
    -- Dates specific to this item
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    
    -- Dispatch / Return Workflow
    dispatched_by UUID REFERENCES users(id) ON DELETE SET NULL,
    dispatched_at TIMESTAMPTZ,
    returned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    returned_at TIMESTAMPTZ,
    
    -- Financials (Item Level)
    subtotal DECIMAL(15,2) DEFAULT 0,
    penalty_amount DECIMAL(15,2) DEFAULT 0,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for new table
CREATE INDEX IF NOT EXISTS idx_rental_items_rental ON rental_items(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_asset ON rental_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_rental_items_status ON rental_items(status);

-- 2. Add rental_item_id to related tables (Nullable first)
ALTER TABLE rental_billings ADD COLUMN IF NOT EXISTS rental_item_id UUID REFERENCES rental_items(id) ON DELETE CASCADE;
ALTER TABLE rental_handovers ADD COLUMN IF NOT EXISTS rental_item_id UUID REFERENCES rental_items(id) ON DELETE CASCADE;

-- 3. Data Migration
-- Insert existing rentals data into rental_items
INSERT INTO rental_items (
    id, rental_id, asset_id, rental_rate_id, 
    rate_amount, status, 
    start_date, expected_end_date, actual_end_date,
    dispatched_by, dispatched_at, returned_by, returned_at,
    subtotal, penalty_amount, notes, created_at, updated_at
)
SELECT 
    gen_random_uuid(), id, asset_id, rental_rate_id,
    daily_rate, status, -- assuming daily_rate was the rate
    start_date, expected_end_date, actual_end_date,
    dispatched_by, dispatched_at, returned_by, returned_at,
    subtotal, penalty_amount, notes, created_at, updated_at
FROM rentals;

-- 4. Update related tables to point to new items
-- Since it was 1-to-1, we join on rental_id
UPDATE rental_billings rb
SET rental_item_id = ri.id
FROM rental_items ri
WHERE rb.rental_id = ri.rental_id;

UPDATE rental_handovers rh
SET rental_item_id = ri.id
FROM rental_items ri
WHERE rh.rental_id = ri.rental_id;

-- 5. Cleanup `rentals` table (Header)
-- We keep: id, rental_number, client_id, status (aggregate), request_date, dates (master), financial totals, approval info, docs.
-- We DROP moved columns to avoid confusion.
-- WARNING: This is destructive. Ensure backup if needed.

ALTER TABLE rentals DROP COLUMN IF EXISTS asset_id;
ALTER TABLE rentals DROP COLUMN IF EXISTS rental_rate_id;
ALTER TABLE rentals DROP COLUMN IF EXISTS daily_rate;
-- We keep dates on header as "Planned Dates" for the whole contract
-- We keep status on header as "Overall Status"
-- We drop dispatch/return info from header as it's item specific now
ALTER TABLE rentals DROP COLUMN IF EXISTS dispatched_by;
ALTER TABLE rentals DROP COLUMN IF EXISTS dispatched_at;
ALTER TABLE rentals DROP COLUMN IF EXISTS returned_by;
ALTER TABLE rentals DROP COLUMN IF EXISTS returned_at;

-- 6. Enforce Foreign Keys
-- Now that data is migrated, rental_billings might ideally require rental_item_id ??
-- Actually, rental_billings are usually per item now.
-- But let's leave it nullable or make it NOT NULL if we are sure?
-- Let's NOT make it NOT NULL yet to avoid breaking if there were orphan billings (though unlikely).
