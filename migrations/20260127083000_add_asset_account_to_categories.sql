-- Add asset_account_id to categories table
-- This allows mapping Asset Categories to GL Control Accounts (e.g. Heavy Equipment -> 1-2200)

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS asset_account_id UUID REFERENCES chart_of_accounts(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_asset_account ON categories(asset_account_id);

-- Optional: Seed default mapping for common categories if COA exists
-- Heavy Equipment (Alat Berat) -> Mesin & Peralatan (1-2300 in our previous seed)
DO $$
DECLARE
    v_acc_machinery UUID;
BEGIN
    SELECT id INTO v_acc_machinery FROM chart_of_accounts WHERE code = '1-2300' LIMIT 1;
    
    IF v_acc_machinery IS NOT NULL THEN
        UPDATE categories SET asset_account_id = v_acc_machinery 
        WHERE name ILIKE '%Alat Berat%' OR name ILIKE '%Heavy Equipment%';
    END IF;
END $$;
