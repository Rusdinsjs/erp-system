-- Delete old, deprecated, or non-standard permissions
DELETE FROM permissions 
WHERE resource IN ('heavy_equipment', 'vehicle', 'infra', 'maintenance', 'report', 'heavy_eq', 'reports_center', 'finance_coa', 'tax_renewals')
   OR action IN ('approve', 'assign', 'checkout', 'checkin', 'transfer', 'dispose', 'request', 'export', 'read', 'update');

-- Create a temporary table for our desired permissions
CREATE TEMP TABLE desired_permissions (
    resource VARCHAR(50),
    action VARCHAR(50),
    name VARCHAR(100),
    description TEXT
);

-- Insert all 40 resources with their 4 standard actions
INSERT INTO desired_permissions (resource, action, name, description)
SELECT 
    res,
    act,
    INITCAP(act) || ' ' || INITCAP(REPLACE(res, '_', ' ')),
    INITCAP(act) || ' permission for ' || REPLACE(res, '_', ' ')
FROM (
    VALUES 
    ('dashboard'), ('analytics'), ('report'), 
    ('asset'), ('asset_lifecycle'), ('categories'), ('location'), ('asset_audit'),
    ('inventory'), ('inventory_category'), ('stock_opname'), ('conversion'),
    ('work_order'), ('preventive_schedule'), ('maintenance_template'), ('fuel'), ('tax_document'), ('loan'),
    ('rental'), ('contract'), ('contract_template'),
    ('sales_invoice'), ('client'), ('purchase_bill'),
    ('finance'), ('cash_bank'), ('expense'), ('journal'), ('financial_report'),
    ('employee'), ('department'), ('attendance'), ('leave'),
    ('role'), ('approval_workflow'), ('audit_log'), ('settings'), ('user'), ('approval_center'), ('profile')
) AS resources(res)
CROSS JOIN (
    VALUES ('view'), ('create'), ('edit'), ('delete')
) AS actions(act);

-- Delete old 'view' permissions if they have the wrong code format (e.g. colon instead of dot)
DELETE FROM permissions WHERE code LIKE '%:%';

-- Insert into real permissions table
INSERT INTO permissions (id, code, name, description, resource, action, created_at)
SELECT 
    gen_random_uuid(), 
    resource || '.' || action, 
    name, 
    description, 
    resource, 
    action, 
    NOW()
FROM desired_permissions
ON CONFLICT (code) DO UPDATE 
SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    resource = EXCLUDED.resource,
    action = EXCLUDED.action;

-- Assign all existing permissions to Super Administrator (Level 1)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_level = 1
ON CONFLICT DO NOTHING;

-- Cleanup temp table
DROP TABLE desired_permissions;
