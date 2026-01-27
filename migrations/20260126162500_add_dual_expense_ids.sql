-- Add granular expense tracking to maintenance_work_orders
ALTER TABLE maintenance_work_orders
ADD COLUMN opex_expense_id UUID REFERENCES asset_expenses(id),
ADD COLUMN capex_expense_id UUID REFERENCES asset_expenses(id);

-- Rename expense_type to labor_expense_type for clarity
ALTER TABLE maintenance_work_orders
RENAME COLUMN expense_type TO labor_expense_type;

-- Update constraint name if needed (optional)
-- The old check constraint chk_wo_expense_type still applies to the renamed column
