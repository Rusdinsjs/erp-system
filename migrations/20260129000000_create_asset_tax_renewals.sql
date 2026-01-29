-- Create asset_tax_renewals table
CREATE TABLE IF NOT EXISTS asset_tax_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    document_type VARCHAR(20) NOT NULL, -- 'STNK', 'TAX', 'KIR', 'LAPOR_TIBA'
    current_expiry DATE NOT NULL,
    renewal_cost DECIMAL(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING_INPUT', -- PENDING_INPUT, PENDING_APPROVAL, APPROVED, INVOICED, PAID, COMPLETED
    invoice_id UUID, -- Link to finance purchase_bills if needed
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_asset_tax_renewals_asset_id ON asset_tax_renewals(asset_id);
CREATE INDEX idx_asset_tax_renewals_status ON asset_tax_renewals(status);
CREATE INDEX idx_asset_tax_renewals_doc_type ON asset_tax_renewals(document_type);
