-- QKRN-011: Transactional Outbox
--
-- Stores async side-effect events atomically with state changes.
-- Background dispatcher polls PENDING rows and delivers them.
-- Dead-lettered rows require manual intervention.

CREATE TABLE IF NOT EXISTS outbox (
    id               UUID         NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type       TEXT         NOT NULL,   -- e.g. 'invoice.posted', 'payment.completed'
    payload          TEXT         NOT NULL,   -- JSON-serialized event payload
    source_type      TEXT         NOT NULL,   -- originating document type
    source_id        UUID         NOT NULL,   -- originating document UUID
    tenant_id        UUID         NOT NULL,
    company_id       UUID         NULL,
    correlation_id   TEXT         NOT NULL DEFAULT '',
    status           TEXT         NOT NULL DEFAULT 'PENDING'
                                  CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','DEAD_LETTER')),
    attempt_count    INTEGER      NOT NULL DEFAULT 0,
    max_attempts     INTEGER      NOT NULL DEFAULT 5,
    next_attempt_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_error       TEXT         NULL,
    completed_at     TIMESTAMPTZ  NULL
);

-- Dispatcher polls: fetch next batch of PENDING rows due for processing
CREATE INDEX IF NOT EXISTS idx_outbox_dispatch
    ON outbox (status, next_attempt_at)
    WHERE status IN ('PENDING', 'FAILED');

-- Traceability: find all outbox events for a source document
CREATE INDEX IF NOT EXISTS idx_outbox_source
    ON outbox (source_type, source_id);

-- Tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_outbox_tenant
    ON outbox (tenant_id, created_at);
