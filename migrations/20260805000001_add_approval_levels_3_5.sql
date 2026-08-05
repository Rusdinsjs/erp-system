-- Migration: Add approval levels 3, 4, 5 columns to approval_requests
-- This enables full 5-level approval workflow support

ALTER TABLE approval_requests 
ADD COLUMN IF NOT EXISTS approved_by_l3 UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at_l3 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes_l3 TEXT,
ADD COLUMN IF NOT EXISTS approved_by_l4 UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at_l4 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes_l4 TEXT,
ADD COLUMN IF NOT EXISTS approved_by_l5 UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at_l5 TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes_l5 TEXT,
ADD COLUMN IF NOT EXISTS delegated_to UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalated_to_role VARCHAR(50);

-- Indexes for approval lookup by approver
CREATE INDEX IF NOT EXISTS idx_approval_requests_approved_by_l3 ON approval_requests(approved_by_l3);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approved_by_l4 ON approval_requests(approved_by_l4);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approved_by_l5 ON approval_requests(approved_by_l5);
CREATE INDEX IF NOT EXISTS idx_approval_requests_delegated_to ON approval_requests(delegated_to);
CREATE INDEX IF NOT EXISTS idx_approval_requests_escalated_at ON approval_requests(escalated_at);

-- Comment for documentation
COMMENT ON COLUMN approval_requests.approved_by_l3 IS 'User ID who approved at level 3';
COMMENT ON COLUMN approval_requests.approved_at_l3 IS 'Timestamp of level 3 approval';
COMMENT ON COLUMN approval_requests.notes_l3 IS 'Notes from level 3 approver';
COMMENT ON COLUMN approval_requests.approved_by_l4 IS 'User ID who approved at level 4';
COMMENT ON COLUMN approval_requests.approved_at_l4 IS 'Timestamp of level 4 approval';
COMMENT ON COLUMN approval_requests.notes_l4 IS 'Notes from level 4 approver';
COMMENT ON COLUMN approval_requests.approved_by_l5 IS 'User ID who approved at level 5';
COMMENT ON COLUMN approval_requests.approved_at_l5 IS 'Timestamp of level 5 approval';
COMMENT ON COLUMN approval_requests.notes_l5 IS 'Notes from level 5 approver';
COMMENT ON COLUMN approval_requests.delegated_to IS 'User ID delegated to approve on behalf';
COMMENT ON COLUMN approval_requests.delegated_at IS 'Timestamp of delegation';
COMMENT ON COLUMN approval_requests.escalated_at IS 'Timestamp when escalated due to timeout';
COMMENT ON COLUMN approval_requests.escalated_to_role IS 'Role code escalated to';