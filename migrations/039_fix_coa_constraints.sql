-- Fix COA Constraints
-- Make fields NOT NULL to match Rust struct definitions

ALTER TABLE chart_of_accounts
    ALTER COLUMN is_active SET NOT NULL,
    ALTER COLUMN currency SET NOT NULL,
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN updated_at SET NOT NULL;
