-- Migration 20260806000014: Phase 7 Asset/EAM Remediation and Integration (QAST-001 s.d QAST-008)

-- 1. Asset Category Accounting Configuration (QAST-001)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS capital_wip_account_id UUID REFERENCES chart_of_accounts(id);
ALTER TABLE categories ADD COLUMN IF NOT EXISTS gain_loss_disposal_account_id UUID REFERENCES chart_of_accounts(id);

-- 2. Asset Disposal Accounting Linkage (QAST-004)
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_voucher_id UUID;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS disposal_amount NUMERIC(20,4);

-- 3. Append-Only Asset Custody & Location History (QAST-005)
CREATE TABLE IF NOT EXISTS asset_custody_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    custodian_user_id UUID REFERENCES users(id),
    department_id UUID REFERENCES departments(id),
    location_id UUID REFERENCES locations(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_asset_custody_asset ON asset_custody_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_custody_custodian ON asset_custody_history(custodian_user_id);

-- Trigger to prevent UPDATE or DELETE on asset_custody_history (QAST-005 Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_custody_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'QAST-005 Immutability Violation: asset_custody_history is append-only. Overwriting prior custody records is forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_custody_history_mutation ON asset_custody_history;
CREATE TRIGGER trg_prevent_custody_history_mutation
BEFORE UPDATE OR DELETE ON asset_custody_history
FOR EACH ROW EXECUTE FUNCTION prevent_custody_history_mutation();
