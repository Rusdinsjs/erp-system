-- Add budget_type column to purchase_orders table
ALTER TABLE purchase_orders 
ADD COLUMN budget_type VARCHAR(10) NOT NULL DEFAULT 'OPEX';

-- Add check constraint for budget_type
ALTER TABLE purchase_orders
ADD CONSTRAINT check_purchase_order_budget_type CHECK (budget_type IN ('OPEX', 'CAPEX'));
