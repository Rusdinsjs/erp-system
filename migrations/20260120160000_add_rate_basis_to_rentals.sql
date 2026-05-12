-- Migration: 20260120160000_add_rate_basis_to_rentals
-- Description: Add rate_basis to rentals table to allow overriding rate basis per rental (e.g. for BCM)
-- Date: 2026-01-20

ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rate_basis VARCHAR(20) DEFAULT 'hourly';
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rental_rate_id UUID REFERENCES rental_rates(id);

-- Note: rental_rate_id might already exist, IF NOT EXISTS handles it safely if supported, 
-- but Postgres ADD COLUMN IF NOT EXISTS is good. 
-- However, strict SQL:
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rentals' AND column_name='rate_basis') THEN
        ALTER TABLE rentals ADD COLUMN rate_basis VARCHAR(20) DEFAULT 'hourly';
    END IF;

    -- Check rental_rate_id in case it was missing from schema but present in struct
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rentals' AND column_name='rental_rate_id') THEN
        ALTER TABLE rentals ADD COLUMN rental_rate_id UUID REFERENCES rental_rates(id);
    END IF;
END $$;
