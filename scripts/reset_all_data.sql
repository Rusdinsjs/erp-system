-- SAFE RESET SCRIPT FOR ASSETS AND INVENTORY
-- This will delete ALL data in assets and inventory modules.
-- Use with caution!

BEGIN;

-- Reset Assets and related data (CASCADE will handle maintenance, history, etc.)
TRUNCATE TABLE assets CASCADE;

-- Reset Inventory and related data (CASCADE will handle movements, etc.)
TRUNCATE TABLE inventory_items CASCADE;

-- Optional: Clear categories/locations if you want a TRULY clean state
-- TRUNCATE TABLE categories CASCADE;
-- TRUNCATE TABLE inventory_categories CASCADE;
-- TRUNCATE TABLE locations CASCADE;

COMMIT;
