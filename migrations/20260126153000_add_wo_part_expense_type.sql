-- Add expense_type to maintenance_work_order_parts
ALTER TABLE maintenance_work_order_parts
ADD COLUMN expense_type VARCHAR(10) DEFAULT 'OPEX';

-- Add check constraint
ALTER TABLE maintenance_work_order_parts
ADD CONSTRAINT chk_part_expense_type CHECK (expense_type IN ('OPEX', 'CAPEX'));
