-- Add KPI fields to rental_billing_periods table (same as rental_billings)

-- Add KPI fields
ALTER TABLE rental_billing_periods
ADD COLUMN IF NOT EXISTS mechanical_availability NUMERIC(5,2),     -- MA %
ADD COLUMN IF NOT EXISTS physical_availability NUMERIC(5,2),       -- PA %
ADD COLUMN IF NOT EXISTS utilization_availability NUMERIC(5,2),    -- UA %
ADD COLUMN IF NOT EXISTS effective_utilization NUMERIC(5,2),       -- EU %
ADD COLUMN IF NOT EXISTS ma_threshold NUMERIC(5,2) DEFAULT 85.00,
ADD COLUMN IF NOT EXISTS availability_penalty NUMERIC(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS adjustment_notes TEXT,
ADD COLUMN IF NOT EXISTS adjusted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS adjusted_at TIMESTAMPTZ;

-- Comment on columns
COMMENT ON COLUMN rental_billing_periods.mechanical_availability IS 'MA = (Total Hours - Breakdown Hours) / Total Hours × 100';
COMMENT ON COLUMN rental_billing_periods.physical_availability IS 'PA = (Working Hours + Standby Hours) / Total Hours × 100';
COMMENT ON COLUMN rental_billing_periods.utilization_availability IS 'UA = Working Hours / (Working Hours + Standby Hours) × 100';
COMMENT ON COLUMN rental_billing_periods.effective_utilization IS 'EU = Working Hours / Total Hours × 100';
