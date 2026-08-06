-- Migration 20260806000015: Phase 8 Platform Services (QJOB-001, QWF-005, QEVT-001)

-- 1. Cluster-Safe Job Locks Table (QJOB-001)
CREATE TABLE IF NOT EXISTS system_job_locks (
    job_name VARCHAR(100) PRIMARY KEY,
    locked_by VARCHAR(100) NOT NULL,
    locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_job_locks_expires ON system_job_locks(expires_at);

-- 2. Trigger to prevent UPDATE or DELETE on immutable approval_histories (QWF-005 Append-Only Enforcement)
CREATE OR REPLACE FUNCTION prevent_approval_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'QWF-005 Immutability Violation: approval_histories is append-only. Overwriting prior approval decisions is forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_approval_history_mutation ON approval_histories;
CREATE TRIGGER trg_prevent_approval_history_mutation
BEFORE UPDATE OR DELETE ON approval_histories
FOR EACH ROW EXECUTE FUNCTION prevent_approval_history_mutation();
