-- Part 1: Modify approval_requests table
ALTER TABLE approval_requests 
    ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES approval_workflows(id),
    ADD COLUMN IF NOT EXISTS required_levels INT DEFAULT 1;

-- Part 2: Seed default approval workflows for all 9 entities
INSERT INTO approval_workflows (id, workflow_name, entity_type, approval_levels, level_1_role, level_2_role, is_active) VALUES
    (gen_random_uuid(), 'Asset Approval', 'asset', 2, 'manager', 'admin', true),
    (gen_random_uuid(), 'Work Order Approval', 'work_order', 1, 'manager', NULL, true),
    (gen_random_uuid(), 'Loan Approval', 'loan', 1, 'manager', NULL, true),
    (gen_random_uuid(), 'Lifecycle Approval', 'lifecycle_transition', 2, 'supervisor', 'manager', true),
    (gen_random_uuid(), 'Rental Approval', 'rental_request', 2, 'manager', 'admin', true),
    (gen_random_uuid(), 'Timesheet Approval', 'timesheet_verification', 1, 'supervisor', NULL, true),
    (gen_random_uuid(), 'Conversion Approval', 'conversion_request', 1, 'supervisor', NULL, true),
    (gen_random_uuid(), 'Fuel Approval', 'fuel_request', 1, 'supervisor', NULL, true),
    (gen_random_uuid(), 'Tax Renewal Approval', 'tax_renewal', 1, 'admin', NULL, true)
ON CONFLICT DO NOTHING;
