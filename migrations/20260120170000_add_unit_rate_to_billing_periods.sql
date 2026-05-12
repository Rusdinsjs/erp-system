-- Add unit_rate column to rental_billing_periods
-- This column stores the rate used for BCM or other rate basis calculations

ALTER TABLE rental_billing_periods
ADD COLUMN IF NOT EXISTS unit_rate NUMERIC(15,2) DEFAULT NULL;

-- Populate existing records with hourly_rate value if present
UPDATE rental_billing_periods
SET unit_rate = hourly_rate
WHERE unit_rate IS NULL AND hourly_rate IS NOT NULL;
