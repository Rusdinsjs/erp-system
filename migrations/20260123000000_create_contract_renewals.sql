-- Create contract_renewals table for tracking renewal history
CREATE TABLE IF NOT EXISTS contract_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    new_contract_id UUID REFERENCES rental_contracts(id) ON DELETE SET NULL,
    renewal_type VARCHAR(20) NOT NULL CHECK (renewal_type IN ('extend', 'modify', 'new')),
    previous_end_date TIMESTAMP NOT NULL,
    new_end_date TIMESTAMP NOT NULL,
    notes TEXT,
    renewed_by UUID REFERENCES users(id),
    renewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX idx_contract_renewals_original ON contract_renewals(original_contract_id);
CREATE INDEX idx_contract_renewals_new ON contract_renewals(new_contract_id);
CREATE INDEX idx_contract_renewals_renewed_at ON contract_renewals(renewed_at);

-- Add trigger for updated_at
CREATE TRIGGER update_contract_renewals_updated_at
    BEFORE UPDATE ON contract_renewals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
