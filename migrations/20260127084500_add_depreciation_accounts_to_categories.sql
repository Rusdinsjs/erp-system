-- Add depreciation accounts to categories table
-- This allows mapping Asset Categories to Depreciation Expense and Accumulated Depreciation accounts

ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS expense_account_id UUID REFERENCES chart_of_accounts(id), -- Debit OPEX (Depreciation Expense)
ADD COLUMN IF NOT EXISTS accumulated_depreciation_account_id UUID REFERENCES chart_of_accounts(id); -- Credit (Accumulated Depr)

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_expense_account ON categories(expense_account_id);
CREATE INDEX IF NOT EXISTS idx_categories_accum_depr_account ON categories(accumulated_depreciation_account_id);
