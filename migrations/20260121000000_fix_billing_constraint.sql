-- Fix Unique Constraint on rental_billing_periods
-- Drop old constraint assuming standard naming convention or by explicit definition if known
-- The constraint usually is rental_billing_periods_rental_id_period_start_period_end_key

ALTER TABLE rental_billing_periods 
DROP CONSTRAINT IF EXISTS rental_billing_periods_rental_id_period_start_period_end_key;

-- Add new constraint including rental_item_id
ALTER TABLE rental_billing_periods
ADD CONSTRAINT rental_billing_periods_item_period_key 
UNIQUE (rental_item_id, period_start, period_end);
