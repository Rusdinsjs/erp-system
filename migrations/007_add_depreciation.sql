-- Migration: 007_add_depreciation
-- Description: Add depreciation calculation support
-- Created: 2026-01-07

-- Enhance categories with depreciation rules
ALTER TABLE categories ADD COLUMN IF NOT EXISTS depreciation_method VARCHAR(50) DEFAULT 'straight_line';
ALTER TABLE categories ADD COLUMN IF NOT EXISTS depreciation_period_months INTEGER;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS residual_rate DECIMAL(5, 4);

-- Depreciation schedules (pre-calculated for reporting)
CREATE TABLE IF NOT EXISTS depreciation_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Values
    opening_value DECIMAL(18, 2) NOT NULL,
    depreciation_amount DECIMAL(18, 2) NOT NULL,
    accumulated_depreciation DECIMAL(18, 2) NOT NULL,
    closing_value DECIMAL(18, 2) NOT NULL,
    
    -- Method used
    depreciation_method VARCHAR(50) NOT NULL,
    
    -- Status
    is_calculated BOOLEAN DEFAULT false,
    calculated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(asset_id, period_start)
);

-- Asset valuation snapshots for historical tracking
CREATE TABLE IF NOT EXISTS asset_valuations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    valuation_date DATE NOT NULL,
    
    -- Values
    original_cost DECIMAL(18, 2),
    accumulated_depreciation DECIMAL(18, 2),
    book_value DECIMAL(18, 2),
    market_value DECIMAL(18, 2),
    replacement_cost DECIMAL(18, 2),
    
    -- Source
    valuation_type VARCHAR(50) DEFAULT 'calculated',  -- calculated, appraisal, market
    appraiser VARCHAR(255),
    notes TEXT,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(asset_id, valuation_date, valuation_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_asset ON depreciation_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_schedules_period ON depreciation_schedules(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_asset_valuations_asset ON asset_valuations(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_valuations_date ON asset_valuations(valuation_date);

-- Function to calculate straight-line depreciation
CREATE OR REPLACE FUNCTION calculate_depreciation(
    p_asset_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    original_cost DECIMAL,
    accumulated_depreciation DECIMAL,
    book_value DECIMAL,
    monthly_depreciation DECIMAL,
    remaining_months INTEGER
) AS $$
DECLARE
    v_purchase_price DECIMAL;
    v_purchase_date DATE;
    v_residual_value DECIMAL;
    v_useful_life_months INTEGER;
    v_months_elapsed INTEGER;
    v_monthly_dep DECIMAL;
    v_accum_dep DECIMAL;
BEGIN
    -- Get asset data
    SELECT a.purchase_price, a.purchase_date, 
           COALESCE(a.residual_value, 0), 
           COALESCE(a.useful_life_months, c.depreciation_period_months, 60)
    INTO v_purchase_price, v_purchase_date, v_residual_value, v_useful_life_months
    FROM assets a
    LEFT JOIN categories c ON a.category_id = c.id
    WHERE a.id = p_asset_id;
    
    IF v_purchase_price IS NULL OR v_purchase_date IS NULL THEN
        RETURN QUERY SELECT 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0::DECIMAL, 0;
        RETURN;
    END IF;
    
    -- Calculate months elapsed
    v_months_elapsed := EXTRACT(YEAR FROM age(p_as_of_date, v_purchase_date)) * 12 
                      + EXTRACT(MONTH FROM age(p_as_of_date, v_purchase_date));
    
    -- Calculate monthly depreciation (straight-line)
    v_monthly_dep := (v_purchase_price - v_residual_value) / v_useful_life_months;
    
    -- Calculate accumulated depreciation (capped at depreciable amount)
    v_accum_dep := LEAST(v_monthly_dep * v_months_elapsed, v_purchase_price - v_residual_value);
    
    RETURN QUERY SELECT 
        v_purchase_price,
        v_accum_dep,
        v_purchase_price - v_accum_dep,
        v_monthly_dep,
        GREATEST(v_useful_life_months - v_months_elapsed, 0)::INTEGER;
END;
$$ LANGUAGE plpgsql;
