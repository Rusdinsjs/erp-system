-- Migration: Add module_callback fields to approval_requests
-- Enables module-specific final approval handling via callbacks

ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS module_callback VARCHAR(100), -- 'work_order', 'loan', 'contract', 'fuel', 'tax_renewal', 'conversion'
ADD COLUMN IF NOT EXISTS callback_data JSONB, -- module-specific data needed for final approval
ADD COLUMN IF NOT EXISTS final_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS final_approved_by UUID REFERENCES users(id);

-- Index for callback lookups
CREATE INDEX IF NOT EXISTS idx_approval_requests_module_callback ON approval_requests(module_callback);

COMMENT ON COLUMN approval_requests.module_callback IS 'Module name for callback on final approval: work_order, loan, contract, fuel, tax_renewal, conversion';
COMMENT ON COLUMN approval_requests.callback_data IS 'Module-specific data for callback: {wo_id, loan_id, contract_id, fuel_id, tax_renewal_id, conversion_id}';
COMMENT ON COLUMN approval_requests.final_approved_at IS 'Timestamp when request reached final approval (all levels complete)';
COMMENT ON COLUMN approval_requests.final_approved_by IS 'User ID who gave the final approval';