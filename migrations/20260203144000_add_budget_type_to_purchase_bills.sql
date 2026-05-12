-- Migration: 20260203144000_add_budget_type_to_purchase_bills
-- Description: Add budget_type column to purchase_bills table for CAPEX/OPEX distinction

ALTER TABLE purchase_bills 
ADD COLUMN budget_type VARCHAR(10) NOT NULL DEFAULT 'OPEX';

-- Add check constraint for budget_type
ALTER TABLE purchase_bills
ADD CONSTRAINT chk_purchase_bill_budget_type CHECK (budget_type IN ('OPEX', 'CAPEX'));

-- Index for reporting
CREATE INDEX idx_purchase_bills_budget_type ON purchase_bills(budget_type);
