-- Migration: 052_merge_conversion_to_work_order.sql
-- Description: Add conversion-specific fields to work orders and migrate existing conversion data if necessary.
-- Created: 2026-01-25

-- 1. Add fields to maintenance_work_orders
ALTER TABLE maintenance_work_orders 
ADD COLUMN IF NOT EXISTS target_category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS target_specifications JSONB,
ADD COLUMN IF NOT EXISTS conversion_notes TEXT,
ADD COLUMN IF NOT EXISTS conversion_type VARCHAR(50); -- e.g., 'upgrade', 'downgrade', 'repurposing'

-- 2. Add 'conversion' as a valid type hint in comments (since it's a VARCHAR field)
COMMENT ON COLUMN maintenance_work_orders.wo_type IS 'Type of work order: predictive, corrective, preventive, calibration, conversion, upgrade';

-- 3. Create a view or keep conversion table for now to avoid breaking existing queries
-- In a real scenario, we might migrate data here, but for this task we focus on the new unified workflow.
