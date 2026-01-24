-- Add multi-level approval support for contracts
ALTER TABLE rental_contracts 
ADD COLUMN IF NOT EXISTS current_approval_step INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_approval_steps INTEGER DEFAULT 2;

ALTER TABLE contract_approvals
ADD COLUMN IF NOT EXISTS approval_level INTEGER DEFAULT 1;

COMMENT ON COLUMN rental_contracts.current_approval_step IS 'Current step in approval workflow (0-N)';
COMMENT ON COLUMN rental_contracts.total_approval_steps IS 'Total required approval steps';
COMMENT ON COLUMN contract_approvals.approval_level IS 'The level/step being approved at this record';
