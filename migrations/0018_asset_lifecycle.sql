-- Migration: 0018_asset_lifecycle
-- Description: Asset Lifecycle Management and Transformation tables
-- Created: 2026-01-10

-- ============================================
-- ASSET LIFECYCLE HISTORY
-- Tracks all state transitions for assets
-- ============================================

CREATE TABLE IF NOT EXISTS asset_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    from_state VARCHAR(50) NOT NULL,
    to_state VARCHAR(50) NOT NULL,
    reason TEXT,
    performed_by UUID REFERENCES users(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_history_asset ON asset_lifecycle_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_history_created ON asset_lifecycle_history(created_at DESC);

-- ============================================
-- ASSET CONVERSIONS
-- Tracks conversion/transformation requests
-- ============================================

CREATE TABLE IF NOT EXISTS asset_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., CNV-2024-001
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    
    -- Status Workflow
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, executed, cancelled
    
    -- Conversion Details
    from_category_id UUID REFERENCES categories(id),
    to_category_id UUID NOT NULL REFERENCES categories(id),
    target_specifications JSONB, -- New specs snapshot
    
    -- Financials
    conversion_cost DECIMAL(18, 2) DEFAULT 0,
    cost_treatment VARCHAR(50) NOT NULL DEFAULT 'capitalize', -- capitalize, expense
    
    -- Meta
    reason TEXT,
    notes TEXT,
    
    -- Actors
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    executed_by UUID REFERENCES users(id),
    
    -- Timestamps
    request_date TIMESTAMPTZ DEFAULT NOW(),
    approval_date TIMESTAMPTZ,
    execution_date TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversions_asset ON asset_conversions(asset_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON asset_conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_request_no ON asset_conversions(request_number);

-- ============================================
-- ASSET SPECIFICATION HISTORY
-- Tracks changes to asset specifications
-- ============================================

CREATE TABLE IF NOT EXISTS asset_specification_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    conversion_id UUID REFERENCES asset_conversions(id),
    change_type VARCHAR(50) NOT NULL, -- 'conversion', 'upgrade', 'modification', 'correction'
    old_category_id UUID REFERENCES categories(id),
    new_category_id UUID REFERENCES categories(id),
    old_subtype VARCHAR(100),
    new_subtype VARCHAR(100),
    old_specifications JSONB,
    new_specifications JSONB,
    changed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spec_history_asset ON asset_specification_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_spec_history_conversion ON asset_specification_history(conversion_id);

-- ============================================
-- UPDATE TRIGGER for asset_conversions
-- ============================================

CREATE OR REPLACE FUNCTION update_asset_conversions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_asset_conversions_updated_at ON asset_conversions;
CREATE TRIGGER trigger_asset_conversions_updated_at
    BEFORE UPDATE ON asset_conversions
    FOR EACH ROW
    EXECUTE FUNCTION update_asset_conversions_updated_at();
