-- Add expense_type to asset_expenses
ALTER TABLE asset_expenses 
ADD COLUMN expense_type VARCHAR(10) NOT NULL DEFAULT 'OPEX';

-- Add check constraint for valid types
ALTER TABLE asset_expenses
ADD CONSTRAINT chk_expense_type CHECK (expense_type IN ('OPEX', 'CAPEX'));

-- Index for filtering by type
CREATE INDEX idx_asset_expenses_type ON asset_expenses(expense_type);
