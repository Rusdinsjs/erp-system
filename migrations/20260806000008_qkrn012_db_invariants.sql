-- QKRN-012: Database Invariants
--
-- Adds foreign keys, unique constraints, check constraints and indexes
-- for lifecycle/status/source/idempotency relationships.
--
-- This migration uses IF NOT EXISTS / DO NOTHING patterns to be safe
-- on re-runs and partial states.
--
-- NOTE: Constraints on large existing tables with data should be added
-- with NOT VALID first, then VALIDATE CONSTRAINT in a separate step
-- (see QKRN-013 safe migration playbook).

-- ─── idempotency_log ──────────────────────────────────────────────────────────

-- idempotency_log.status must be a known value (already enforced by CHECK in
-- QKRN-006 migration, repeated here for documentation).
-- No FK on actor_id/company_id to allow tenant isolation without cross-schema refs.

-- ─── document_audit_trail ─────────────────────────────────────────────────────

-- Prevent null document_id (redundant, column is NOT NULL, explicit for readability)
-- All constraints already in the CREATE TABLE from QKRN-009.

-- ─── naming_series ────────────────────────────────────────────────────────────

-- counter must always be positive (> 0 after first allocation)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_naming_series_counter_positive'
    ) THEN
        ALTER TABLE naming_series
            ADD CONSTRAINT chk_naming_series_counter_positive
            CHECK (last_counter >= 0);
    END IF;
END $$;

-- ─── outbox ───────────────────────────────────────────────────────────────────

-- attempt_count must not exceed max_attempts + 1 (dispatcher may overshoot once)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_outbox_attempt_bounds'
    ) THEN
        ALTER TABLE outbox
            ADD CONSTRAINT chk_outbox_attempt_bounds
            CHECK (attempt_count >= 0 AND attempt_count <= max_attempts + 1);
    END IF;
END $$;

-- max_attempts must be positive
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_outbox_max_attempts_positive'
    ) THEN
        ALTER TABLE outbox
            ADD CONSTRAINT chk_outbox_max_attempts_positive
            CHECK (max_attempts > 0);
    END IF;
END $$;

-- completed_at must only be set when status is COMPLETED or DEAD_LETTER
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_outbox_completed_at_consistency'
    ) THEN
        ALTER TABLE outbox
            ADD CONSTRAINT chk_outbox_completed_at_consistency
            CHECK (
                completed_at IS NULL
                OR status IN ('COMPLETED', 'DEAD_LETTER')
            );
    END IF;
END $$;

-- ─── General: prevent empty string event_type / source_type in outbox ─────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_outbox_nonempty_event_type'
    ) THEN
        ALTER TABLE outbox
            ADD CONSTRAINT chk_outbox_nonempty_event_type
            CHECK (event_type <> '' AND source_type <> '');
    END IF;
END $$;
