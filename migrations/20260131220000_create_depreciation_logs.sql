-- Migration: 20260131220000_create_depreciation_logs
-- Description: stored history of automated depreciation runs

CREATE TABLE IF NOT EXISTS asset_depreciation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    journal_entry_id UUID REFERENCES journal_entries(id), -- Nullable if journal failed but log kept? Or strictly linked.
    
    amount DECIMAL(18, 2) NOT NULL,
    depreciation_date DATE NOT NULL, -- The date this depreciation applies to (usually end of month)
    
    period_month INTEGER NOT NULL, -- 1-12
    period_year INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_depreciation_asset_id ON asset_depreciation_logs(asset_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_period ON asset_depreciation_logs(period_year, period_month);
