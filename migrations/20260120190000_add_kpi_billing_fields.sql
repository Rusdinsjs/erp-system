-- Add KPI (Key Performance Indicator) fields to rental billing system
-- For calculating MA, PA, UA, EU and availability penalties

-- Add KPI fields to rental_billings
ALTER TABLE rental_billings
ADD COLUMN IF NOT EXISTS mechanical_availability NUMERIC(5,2),     -- MA %
ADD COLUMN IF NOT EXISTS physical_availability NUMERIC(5,2),       -- PA %
ADD COLUMN IF NOT EXISTS utilization_availability NUMERIC(5,2),    -- UA %
ADD COLUMN IF NOT EXISTS effective_utilization NUMERIC(5,2),       -- EU %
ADD COLUMN IF NOT EXISTS ma_threshold NUMERIC(5,2) DEFAULT 85.00,
ADD COLUMN IF NOT EXISTS availability_penalty NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_notes TEXT,
ADD COLUMN IF NOT EXISTS adjusted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS adjusted_at TIMESTAMPTZ;

-- Add threshold config to rental_rates
ALTER TABLE rental_rates
ADD COLUMN IF NOT EXISTS ma_threshold NUMERIC(5,2) DEFAULT 85.00,
ADD COLUMN IF NOT EXISTS availability_penalty_multiplier NUMERIC(5,2) DEFAULT 1.0;

-- Comment on columns
COMMENT ON COLUMN rental_billings.mechanical_availability IS 'MA = (Total Hours - Breakdown Hours) / Total Hours × 100';
COMMENT ON COLUMN rental_billings.physical_availability IS 'PA = (Working Hours + Standby Hours) / Total Hours × 100';
COMMENT ON COLUMN rental_billings.utilization_availability IS 'UA = Working Hours / (Working Hours + Standby Hours) × 100';
COMMENT ON COLUMN rental_billings.effective_utilization IS 'EU = Working Hours / Total Hours × 100';
COMMENT ON COLUMN rental_billings.availability_penalty IS 'Penalty applied when MA < threshold';
