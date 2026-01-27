-- Add expense fields to maintenance_work_orders
ALTER TABLE maintenance_work_orders
ADD COLUMN expense_type VARCHAR(10),
ADD COLUMN expense_id UUID REFERENCES asset_expenses(id);

-- Add check constraint for expense_type
ALTER TABLE maintenance_work_orders
ADD CONSTRAINT chk_wo_expense_type CHECK (expense_type IN ('OPEX', 'CAPEX'));
