# ADR-002: Safe Migration Playbook (QKRN-013)

**Status**: Accepted  
**Date**: 2026-08-06  
**Context**: ERPQu — Phase 3 Kernel & Platform

---

## Problem

ERPQu operates on a live PostgreSQL database that must never have downtime during schema migrations. Adding constraints, renaming columns, or backfilling large tables can lock rows for extended periods and break in-flight requests.

---

## Decision

All schema changes that touch **existing data or large tables** follow this seven-step playbook:

### Step 1 — Add new schema (non-breaking)

Add new nullable columns, new tables, new indexes `CONCURRENTLY`, or new FK columns (`NULL` initially). This step is always safe and non-blocking.

```sql
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS source_id UUID NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_source ON invoices (source_id);
```

### Step 2 — Backfill in bounded batches

Populate the new column in batches of ≤ 5,000 rows with a short sleep between batches to avoid locking:

```sql
DO $$
DECLARE
    batch_size INT := 5000;
    last_id UUID := '00000000-0000-0000-0000-000000000000';
    rows_updated INT;
BEGIN
    LOOP
        WITH batch AS (
            SELECT id FROM invoices WHERE id > last_id AND source_id IS NULL
            ORDER BY id LIMIT batch_size
        )
        UPDATE invoices SET source_id = '<backfill_value>'
        WHERE id IN (SELECT id FROM batch);

        GET DIAGNOSTICS rows_updated = ROW_COUNT;
        EXIT WHEN rows_updated = 0;

        SELECT MAX(id) INTO last_id FROM (
            SELECT id FROM invoices WHERE id > last_id ORDER BY id LIMIT batch_size
        ) sub;

        PERFORM pg_sleep(0.05); -- 50 ms pause between batches
    END LOOP;
END $$;
```

### Step 3 — Compare / reconcile

Run a SELECT COUNT to verify the backfill covered all rows. Log discrepancies.

```sql
SELECT COUNT(*) FROM invoices WHERE source_id IS NULL;
-- Expected: 0
```

### Step 4 — Enable new writes

Update application code to write the new column on all INSERT / UPDATE paths. Deploy this version first **before** adding NOT NULL constraint.

### Step 5 — Add constraints safely (NOT VALID first)

```sql
-- Add constraint without scanning existing rows:
ALTER TABLE invoices
    ADD CONSTRAINT fk_invoices_source_document FOREIGN KEY (source_id)
    REFERENCES documents(id) NOT VALID;

-- Validate in a separate transaction (acquires ShareUpdateExclusiveLock only):
ALTER TABLE invoices VALIDATE CONSTRAINT fk_invoices_source_document;
```

For `NOT NULL`:
```sql
-- Postgres 12+: NOT NULL without full table rewrite via CHECK NOT VALID
ALTER TABLE invoices ADD CONSTRAINT chk_source_id_notnull CHECK (source_id IS NOT NULL) NOT VALID;
ALTER TABLE invoices VALIDATE CONSTRAINT chk_source_id_notnull;
-- Then enforce at DB level:
ALTER TABLE invoices ALTER COLUMN source_id SET NOT NULL; -- requires no nulls exist
```

### Step 6 — Remove legacy code paths

After the new column is fully populated and constraints are active, remove the old write paths and reads. This is a pure application change.

### Step 7 — Drop legacy columns (separate migration, later)

Only after confirming no code references the old column, drop it in a dedicated later migration with its own backup checkpoint:

```sql
-- Verify in production logs that no queries hit old column for ≥ 2 weeks
ALTER TABLE invoices DROP COLUMN IF EXISTS old_source_ref;
```

---

## Consequences

- Zero-downtime schema changes at any table size.
- Backfill duration depends on table size; large tables may require scheduled maintenance windows for validation.
- Each destructive cleanup (column drop) must be a separate migration with its own PR, review, and backup checkpoint.
- Never combine backfill + constraint + drop in a single migration.

---

## Anti-patterns to avoid

| Anti-pattern | Risk | Alternative |
|---|---|---|
| `ALTER TABLE … SET NOT NULL` before backfill | Full table scan + lock | Use NOT VALID + VALIDATE |
| Dropping a column in same migration as adding constraint | Risk if validation fails | Separate migrations |
| Adding index without CONCURRENTLY | Table lock | `CREATE INDEX CONCURRENTLY` |
| Backfilling in one UPDATE (no batching) | Long lock / timeout | Batch + sleep |

---

## References

- [PostgreSQL: ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [Strong Migrations (Rails)](https://github.com/ankane/strong_migrations) — conceptual reference
- QKRN-012 (Database Invariants)
- ADR-001 (Modular Monolith & Invariants)
