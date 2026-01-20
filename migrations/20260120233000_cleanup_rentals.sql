-- Cleanup rentals table
ALTER TABLE rentals
DROP COLUMN IF EXISTS total_days,
DROP COLUMN IF EXISTS delivery_note,
DROP COLUMN IF EXISTS rate_basis;
