-- Create contract_approvals table for tracking approval history
CREATE TABLE contract_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'submitted', 'approved', 'rejected'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_contract_approvals_contract ON contract_approvals(contract_id);
CREATE INDEX idx_contract_approvals_approver ON contract_approvals(approver_id);
CREATE INDEX idx_contract_approvals_created ON contract_approvals(created_at DESC);

-- Add approval-related fields to rental_contracts
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Add comment for documentation
COMMENT ON TABLE contract_approvals IS 'Tracks approval history for rental contracts';
COMMENT ON COLUMN contract_approvals.action IS 'Action taken: submitted, approved, or rejected';
