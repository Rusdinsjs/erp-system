-- 3R.1.1: distinguish a safe replay from reuse of the same key for another command.
ALTER TABLE idempotency_log
    ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE idempotency_log
SET request_fingerprint = 'legacy:' || idempotency_key
WHERE request_fingerprint IS NULL;

ALTER TABLE idempotency_log
    ALTER COLUMN request_fingerprint SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_idempotency_request_fingerprint_nonempty'
    ) THEN
        ALTER TABLE idempotency_log
            ADD CONSTRAINT chk_idempotency_request_fingerprint_nonempty
            CHECK (length(btrim(request_fingerprint)) > 0);
    END IF;
END $$;
