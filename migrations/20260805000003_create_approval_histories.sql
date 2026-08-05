-- Migration: Create approval_histories table for complete audit trail
-- Tracks every action on approval requests: created, approved, rejected, delegated, escalated

CREATE TABLE IF NOT EXISTS approval_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'approved', 'rejected', 'delegated', 'escalated', 'reassigned'
    actor_id UUID NOT NULL REFERENCES users(id),
    level INTEGER NOT NULL, -- approval level (1-5) where action occurred
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    notes TEXT,
    metadata JSONB, -- additional context: {delegated_to, escalated_to_role, reassigned_from, etc.}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_approval_histories_request ON approval_histories(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_histories_actor ON approval_histories(actor_id);
CREATE INDEX IF NOT EXISTS idx_approval_histories_created ON approval_histories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_histories_action ON approval_histories(action);

-- Trigger to update updated_at on approval_requests when history is logged
-- (optional: for tracking last activity)
-- CREATE TRIGGER update_approval_requests_activity
--     AFTER INSERT ON approval_histories
--     FOR EACH ROW EXECUTE FUNCTION update_approval_requests_activity();

COMMENT ON TABLE approval_histories IS 'Complete audit trail for all approval request actions';
COMMENT ON COLUMN approval_histories.action IS 'Action type: created, approved, rejected, delegated, escalated, reassigned';
COMMENT ON COLUMN approval_histories.level IS 'Approval level (1-5) where the action occurred';
COMMENT ON COLUMN approval_histories.metadata IS 'JSON context: delegated_to, escalated_to_role, reassigned_from, etc.';