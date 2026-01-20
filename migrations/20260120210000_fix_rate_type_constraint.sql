-- Drop the restrictive CHECK constraint on rate_type
-- It currently only allows 'daily', 'weekly', 'monthly'
-- We need to support 'hourly', 'bcm', and potentially others

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_rates_rate_type_check') THEN
        ALTER TABLE rental_rates DROP CONSTRAINT rental_rates_rate_type_check;
    END IF;
END $$;
