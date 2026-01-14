CREATE TABLE audit_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(50) NOT NULL, -- 'open', 'closed'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ
);

CREATE TABLE audit_records (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES audit_sessions(id),
    asset_id UUID NOT NULL REFERENCES assets(id),
    status VARCHAR(50) NOT NULL, -- 'found', 'missing', 'damaged'
    notes TEXT,
    scanned_at TIMESTAMPTZ NOT NULL
);

-- Index for performance
CREATE INDEX idx_audit_sessions_status ON audit_sessions(status);
CREATE INDEX idx_audit_records_session_id ON audit_records(session_id);
