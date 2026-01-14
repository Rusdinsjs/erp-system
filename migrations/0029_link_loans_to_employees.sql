-- Migration: 0029_link_loans_to_employees
-- Description: Link asset_loans with employees table
-- Created: 2026-01-12

ALTER TABLE asset_loans ADD COLUMN employee_id UUID REFERENCES employees(id);
ALTER TABLE asset_loans ALTER COLUMN borrower_id DROP NOT NULL;

-- Create index for performance
CREATE INDEX idx_asset_loans_employee ON asset_loans(employee_id);
