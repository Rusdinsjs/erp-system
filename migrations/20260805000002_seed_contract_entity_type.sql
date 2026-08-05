-- Migration: Seed contract entity type for approval workflows
-- Add 'contract' to approval_entity_types so it can have approval workflows

INSERT INTO approval_entity_types (id, value, label, icon, color, description, backend_module, is_system) VALUES
    (gen_random_uuid(), 'contract', 'Contract', 'FileText', 'text-cyan-400', 'Contract creation, renewal, and amendments', 'contract_service', true)
ON CONFLICT (value) DO NOTHING;

-- Also add purchase_order and expense_report as common business entities
INSERT INTO approval_entity_types (id, value, label, icon, color, description, backend_module, is_system) VALUES
    (gen_random_uuid(), 'purchase_order', 'Purchase Order', 'ShoppingCart', 'text-indigo-400', 'Purchase order approval requests', 'purchase_service', true),
    (gen_random_uuid(), 'expense_report', 'Expense Report', 'Receipt', 'text-rose-400', 'Expense reimbursement approval requests', 'finance_service', true),
    (gen_random_uuid(), 'vendor_registration', 'Vendor Registration', 'UserCheck', 'text-teal-400', 'New vendor registration approval', 'vendor_service', true),
    (gen_random_uuid(), 'leave_request', 'Leave Request', 'Calendar', 'text-amber-400', 'Employee leave approval requests', 'employee_service', true),
    (gen_random_uuid(), 'overtime_request', 'Overtime Request', 'Clock', 'text-yellow-400', 'Employee overtime approval requests', 'employee_service', true)
ON CONFLICT (value) DO NOTHING;