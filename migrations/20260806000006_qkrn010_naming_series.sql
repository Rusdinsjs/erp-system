-- QKRN-010: Concurrency-safe Document Naming Series
--
-- Allocates sequential document numbers scoped by entity_type, company, and year.
-- The counter increments atomically via INSERT … ON CONFLICT DO UPDATE inside
-- the active UnitOfWork transaction — no two concurrent transactions receive the
-- same counter value for the same series.

CREATE TABLE IF NOT EXISTS naming_series (
    entity_type   TEXT     NOT NULL,   -- e.g. 'INVOICE', 'BILL', 'PURCHASE_ORDER'
    company_id    UUID     NOT NULL,   -- series are per-company
    prefix        TEXT     NOT NULL,   -- short code, e.g. 'INV', 'PO', 'BL'
    year          INTEGER  NOT NULL,   -- calendar year; counter resets yearly
    last_counter  BIGINT   NOT NULL DEFAULT 0,
    PRIMARY KEY (entity_type, company_id, prefix, year)
);

-- Fast lookup for the current counter (preview, not allocation)
CREATE INDEX IF NOT EXISTS idx_naming_series_lookup
    ON naming_series (entity_type, company_id, year);
