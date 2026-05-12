-- Migration: 20260120_add_bcm_support
-- Description: Add columns for BCM (Bank Cubic Meter) production volume tracking
-- Date: 2026-01-20

-- 1. Add production volume to Rental Timesheets
ALTER TABLE rental_timesheets ADD COLUMN IF NOT EXISTS production_volume DECIMAL(12,2) DEFAULT 0;
ALTER TABLE rental_timesheets ADD COLUMN IF NOT EXISTS production_unit VARCHAR(20) DEFAULT 'BCM';

-- 2. Add total production volume to Rental Billing Periods
ALTER TABLE rental_billing_periods ADD COLUMN IF NOT EXISTS total_production_volume DECIMAL(15,2) DEFAULT 0;

-- 3. Ensure billing periods table has necessary fields for calculation (rate_amount usually inherited but good to check)
-- rate_amount is usually in `hourly_rate` or we might need a generic `rate_amount` in billing periods if basis changes.
-- 022 migration has `hourly_rate DECIMAL(15,2)`.
-- If we use BCM, `hourly_rate` might be confusing. Let's add `rate_amount` alias or just strictly use `hourly_rate` column for value?
-- Better to rename or add `unit_rate`?
-- Existing `hourly_rate` is used. Use `unit_rate` for clarity?
ALTER TABLE rental_billing_periods ADD COLUMN IF NOT EXISTS unit_rate DECIMAL(15,2);
-- We can migrate existing `hourly_rate` to `unit_rate` later if we refactor, but for now let's keep it additive.
