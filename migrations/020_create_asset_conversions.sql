-- Migration: 020_create_asset_conversions.sql
-- Description: Create table for asset conversions (Note: already handled in migration 18, keeping for compatibility)

CREATE TABLE IF NOT EXISTS asset_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    from_category_id UUID REFERENCES categories(id),
    to_category_id UUID NOT NULL REFERENCES categories(id),
    target_specifications JSONB,
    conversion_cost DECIMAL(18, 2) DEFAULT 0,
    cost_treatment VARCHAR(50) NOT NULL DEFAULT 'capitalize',
    reason TEXT,
    notes TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    executed_by UUID REFERENCES users(id),
    request_date TIMESTAMPTZ DEFAULT NOW(),
    approval_date TIMESTAMPTZ,
    execution_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_asset_conversions_asset_id ON asset_conversions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_conversions_status ON asset_conversions(status);
CREATE INDEX IF NOT EXISTS idx_asset_conversions_request_no ON asset_conversions(request_number);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_asset_conversions_updated_at ON asset_conversions;
CREATE TRIGGER update_asset_conversions_updated_at BEFORE UPDATE ON asset_conversions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
