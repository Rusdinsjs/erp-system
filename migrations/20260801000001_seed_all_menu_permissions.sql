-- Migration: Seed All Menu Permissions
-- Description: Ensures every menu resource has view, create, edit, delete permissions

DO $$
DECLARE
    res TEXT;
    act TEXT;
    p_code TEXT;
    p_name TEXT;
    resources TEXT[] := ARRAY[
        'dashboard',
        'analytics',
        'report',
        'asset',
        'asset_lifecycle',
        'categories',
        'location',
        'asset_audit',
        'work_order',
        'conversion',
        'preventive_schedule',
        'maintenance_template',
        'fuel',
        'loan',
        'tax_document',
        'rental',
        'contract',
        'contract_template',
        'client',
        'sales_invoice',
        'inventory',
        'inventory_category',
        'stock_opname',
        'purchase_bill',
        'finance',
        'cash_bank',
        'expense',
        'journal',
        'financial_report',
        'employee',
        'department',
        'attendance',
        'leave',
        'approval_center',
        'user',
        'role',
        'approval_workflow',
        'audit_log',
        'settings',
        'profile',
        'heavy_equipment',
        'infra',
        'vehicle',
        'maintenance'
    ];
    actions TEXT[] := ARRAY['read', 'create', 'update', 'delete'];
BEGIN
    FOREACH res IN ARRAY resources LOOP
        FOREACH act IN ARRAY actions LOOP
            p_code := res || '.' || act;
            p_name := INITCAP(REPLACE(res, '_', ' ')) || ' ' || INITCAP(act);
            
            INSERT INTO permissions (code, name, description, resource, action)
            VALUES (p_code, p_name, 'Permission for ' || p_name, res, act)
            ON CONFLICT (code) DO UPDATE 
            SET resource = EXCLUDED.resource, action = EXCLUDED.action;
        END LOOP;
    END LOOP;
END $$;
