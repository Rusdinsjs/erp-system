-- Add permissions for all missing modules/pages
INSERT INTO permissions (id, code, name, description, resource, action, created_at) VALUES
-- Dashboard & Insights
(gen_random_uuid(), 'dashboard:view', 'View Dashboard', 'View dashboard overview', 'dashboard', 'view', NOW()),
(gen_random_uuid(), 'analytics:view', 'View Analytics', 'View performance analytics', 'analytics', 'view', NOW()),
(gen_random_uuid(), 'reports:view', 'View Reports', 'View management reports', 'reports', 'view', NOW()),

-- Asset Management (Extensions)
(gen_random_uuid(), 'asset_lifecycle:view', 'View Lifecycle', 'View asset lifecycle', 'asset_lifecycle', 'view', NOW()),
(gen_random_uuid(), 'categories:view', 'View Categories', 'View asset categories', 'categories', 'view', NOW()),
(gen_random_uuid(), 'categories:create', 'Create Category', 'Create asset category', 'categories', 'create', NOW()),
(gen_random_uuid(), 'categories:edit', 'Edit Category', 'Edit asset category', 'categories', 'edit', NOW()),
(gen_random_uuid(), 'categories:delete', 'Delete Category', 'Delete asset category', 'categories', 'delete', NOW()),
(gen_random_uuid(), 'location:view', 'View Locations', 'View asset locations', 'location', 'view', NOW()),
(gen_random_uuid(), 'location:create', 'Create Location', 'Create asset location', 'location', 'create', NOW()),
(gen_random_uuid(), 'location:edit', 'Edit Location', 'Edit asset location', 'location', 'edit', NOW()),
(gen_random_uuid(), 'location:delete', 'Delete Location', 'Delete asset location', 'location', 'delete', NOW()),

-- Inventory
(gen_random_uuid(), 'inventory:view', 'View Inventory', 'View inventory items', 'inventory', 'view', NOW()),
(gen_random_uuid(), 'inventory:create', 'Create Item', 'Create inventory item', 'inventory', 'create', NOW()),
(gen_random_uuid(), 'inventory:edit', 'Edit Item', 'Edit inventory item', 'inventory', 'edit', NOW()),
(gen_random_uuid(), 'inventory:delete', 'Delete Item', 'Delete inventory item', 'inventory', 'delete', NOW()),
(gen_random_uuid(), 'inventory_category:view', 'View Inv Categories', 'View inventory categories', 'inventory_category', 'view', NOW()),
(gen_random_uuid(), 'stock_opname:view', 'View Stock Opname', 'View stock opname', 'stock_opname', 'view', NOW()),
(gen_random_uuid(), 'stock_opname:create', 'Create Stock Opname', 'Create stock opname', 'stock_opname', 'create', NOW()),

-- Field Operations (Extensions)
(gen_random_uuid(), 'conversion:view', 'View Conversions', 'View conversions', 'conversion', 'view', NOW()),
(gen_random_uuid(), 'conversion:create', 'Create Conversion', 'Create conversion', 'conversion', 'create', NOW()),
(gen_random_uuid(), 'maintenance_template:view', 'View SOP Templates', 'View SOP templates', 'maintenance_template', 'view', NOW()),
(gen_random_uuid(), 'maintenance_template:create', 'Create SOP Template', 'Create SOP template', 'maintenance_template', 'create', NOW()),
(gen_random_uuid(), 'maintenance_template:edit', 'Edit SOP Template', 'Edit SOP template', 'maintenance_template', 'edit', NOW()),
(gen_random_uuid(), 'fuel:view', 'View Fuel', 'View fuel management', 'fuel', 'view', NOW()),
(gen_random_uuid(), 'fuel:create', 'Log Fuel', 'Log fuel transaction', 'fuel', 'create', NOW()),
(gen_random_uuid(), 'tax_document:view', 'View Tax/Docs', 'View tax and documents', 'tax_document', 'view', NOW()),
(gen_random_uuid(), 'tax_document:edit', 'Edit Tax/Docs', 'Edit tax and documents', 'tax_document', 'edit', NOW()),

-- Rental & Contracts
(gen_random_uuid(), 'rental:view', 'View Rentals', 'View rental orders', 'rental', 'view', NOW()),
(gen_random_uuid(), 'rental:create', 'Create Rental', 'Create rental order', 'rental', 'create', NOW()),
(gen_random_uuid(), 'rental:edit', 'Edit Rental', 'Edit rental order', 'rental', 'edit', NOW()),
(gen_random_uuid(), 'contract:view', 'View Contracts', 'View contracts', 'contract', 'view', NOW()),
(gen_random_uuid(), 'contract:create', 'Create Contract', 'Create contract', 'contract', 'create', NOW()),
(gen_random_uuid(), 'contract:edit', 'Edit Contract', 'Edit contract', 'contract', 'edit', NOW()),
(gen_random_uuid(), 'contract_template:view', 'View Contract Templates', 'View contract templates', 'contract_template', 'view', NOW()),

-- Finance
(gen_random_uuid(), 'finance_coa:view', 'View COA', 'View chart of accounts', 'finance_coa', 'view', NOW()),
(gen_random_uuid(), 'cash_bank:view', 'View Cash & Bank', 'View cash and bank', 'cash_bank', 'view', NOW()),
(gen_random_uuid(), 'cash_bank:create', 'Add Transaction', 'Add cash/bank transaction', 'cash_bank', 'create', NOW()),
(gen_random_uuid(), 'expense:view', 'View Expenses', 'View expenses', 'expense', 'view', NOW()),
(gen_random_uuid(), 'expense:create', 'Create Expense', 'Create expense', 'expense', 'create', NOW()),
(gen_random_uuid(), 'journal:view', 'View Journals', 'View journal entries', 'journal', 'view', NOW()),
(gen_random_uuid(), 'journal:create', 'Create Journal', 'Create journal entry', 'journal', 'create', NOW()),
(gen_random_uuid(), 'financial_report:view', 'View Financial Reports', 'View financial reports', 'financial_report', 'view', NOW()),

-- Commercial
(gen_random_uuid(), 'sales_invoice:view', 'View Invoices', 'View sales invoices', 'sales_invoice', 'view', NOW()),
(gen_random_uuid(), 'sales_invoice:create', 'Create Invoice', 'Create sales invoice', 'sales_invoice', 'create', NOW()),
(gen_random_uuid(), 'purchase_bill:view', 'View Bills', 'View vendor bills', 'purchase_bill', 'view', NOW()),
(gen_random_uuid(), 'purchase_bill:create', 'Create Bill', 'Create vendor bill', 'purchase_bill', 'create', NOW()),

-- HR & Organization
(gen_random_uuid(), 'employee:view', 'View Employees', 'View employees', 'employee', 'view', NOW()),
(gen_random_uuid(), 'employee:create', 'Create Employee', 'Create employee', 'employee', 'create', NOW()),
(gen_random_uuid(), 'employee:edit', 'Edit Employee', 'Edit employee', 'employee', 'edit', NOW()),
(gen_random_uuid(), 'department:view', 'View Departments', 'View departments', 'department', 'view', NOW()),
(gen_random_uuid(), 'attendance:view', 'View Attendance', 'View attendance records', 'attendance', 'view', NOW()),
(gen_random_uuid(), 'attendance:create', 'Manage Attendance', 'Manage attendance', 'attendance', 'create', NOW()),
(gen_random_uuid(), 'leave:view', 'View Leaves', 'View leave requests', 'leave', 'view', NOW()),
(gen_random_uuid(), 'client:view', 'View Clients', 'View clients and partners', 'client', 'view', NOW()),
(gen_random_uuid(), 'client:create', 'Create Client', 'Create client', 'client', 'create', NOW()),

-- System & Settings
(gen_random_uuid(), 'approval_center:view', 'View Approval Center', 'View approval center', 'approval_center', 'view', NOW()),
(gen_random_uuid(), 'reports_center:view', 'View Reports Center', 'View reports center', 'reports_center', 'view', NOW()),
(gen_random_uuid(), 'audit_log:view', 'View Audit Logs', 'View audit logs', 'audit_log', 'view', NOW()),
(gen_random_uuid(), 'settings:view', 'View Settings', 'View application settings', 'settings', 'view', NOW()),
(gen_random_uuid(), 'settings:edit', 'Edit Settings', 'Edit application settings', 'settings', 'edit', NOW())
ON CONFLICT (code) DO NOTHING;

-- Assign all new permissions to Super Administrator (Level 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_level = 1
ON CONFLICT DO NOTHING;
