-- SAFE RESET SCRIPT FOR ASSETS
-- This will delete ALL assets and related data (maintenance, loans, etc.)
-- Use with caution!

BEGIN;

-- Disable triggers if necessary, but TRUNCATE CASCADE usually works
TRUNCATE TABLE assets CASCADE;

-- If you want to clear categories too (optional, uncomment if needed)
-- TRUNCATE TABLE categories CASCADE;

-- If you want to clear locations too (optional, uncomment if needed)
-- TRUNCATE TABLE locations CASCADE;

COMMIT;
