-- Migration: 20260201000000_add_expense_type_to_finance
-- Description: Add expense_type column to expenses table for CAPEX/OPEX distinction

-- 1. Add column with default 'OPEX'
ALTER TABLE expenses
ADD COLUMN expense_type VARCHAR(10) NOT NULL DEFAULT 'OPEX';

-- 2. Add check constraint
ALTER TABLE expenses
ADD CONSTRAINT chk_finance_expense_type CHECK (expense_type IN ('OPEX', 'CAPEX'));

-- 3. Create index for filtering
CREATE INDEX idx_expenses_type ON expenses(expense_type);
