-- QKRN-006: Idempotency Log
--
-- Records every submit/post action's idempotency key so retried requests
-- cannot create duplicate ledger entries.
--
-- Lifecycle:
--   PROCESSING  → request is being handled (INSERT on first attempt)
--   COMPLETED   → request finished successfully; duplicate can return cached result
--   FAILED      → request failed; duplicate MAY retry (application policy)

CREATE TABLE IF NOT EXISTS idempotency_log (
    idempotency_key  TEXT         NOT NULL PRIMARY KEY,
    actor_id         UUID         NOT NULL,
    company_id       UUID         NOT NULL,
    source_type      TEXT         NOT NULL,
    source_id        UUID         NOT NULL,
    correlation_id   TEXT         NOT NULL,
    status           TEXT         NOT NULL DEFAULT 'PROCESSING'
                                  CHECK (status IN ('PROCESSING','COMPLETED','FAILED')),
    outcome          TEXT         NULL,      -- serialized result or error summary
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at     TIMESTAMPTZ  NULL
);

-- Lookup by source document (e.g. find all idempotency records for an invoice)
CREATE INDEX IF NOT EXISTS idx_idempotency_log_source
    ON idempotency_log (source_type, source_id);

-- Purge old COMPLETED/FAILED records by scheduled job (retention window TBD)
CREATE INDEX IF NOT EXISTS idx_idempotency_log_created_at
    ON idempotency_log (created_at);
