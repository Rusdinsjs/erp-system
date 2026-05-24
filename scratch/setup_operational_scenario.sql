-- Setup Operational Scenario: 3 Specialists and 1 Manager
-- Path: scratch/setup_operational_scenario.sql

DO $$
DECLARE
    org_id UUID := '11111111-1111-1111-1111-111111111111';
    dept_ops UUID := '22222222-2222-2222-2222-222222222204'; -- Operations
    dept_it UUID := '22222222-2222-2222-2222-222222222201'; -- IT
    
    role_berat UUID;
    role_kendaraan UUID;
    role_infra UUID;
    role_manager UUID;
    
    -- Password hash for 'admin123'
    password_hash VARCHAR := '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ';
BEGIN
    -- Get Role IDs
    SELECT id INTO role_berat FROM roles WHERE code = 'admin_alat_berat';
    SELECT id INTO role_kendaraan FROM roles WHERE code = 'admin_kendaraan';
    SELECT id INTO role_infra FROM roles WHERE code = 'admin_infrastruktur';
    SELECT id INTO role_manager FROM roles WHERE code = 'manager';

    -- Clean up all approval tables that reference our test users
    DELETE FROM approval_requests WHERE requested_by IN (
        SELECT id FROM users WHERE email IN ('berat@sjs.com', 'mobil@sjs.com', 'infra@sjs.com', 'manager@sjs.com')
    );

    -- Clean up other reference tables
    DELETE FROM assets WHERE asset_code IN ('EXC-PC200-01', 'TRK-M01');
    DELETE FROM categories WHERE code IN ('EXC', 'TRK');

    -- Clean up previous test users
    DELETE FROM users WHERE email IN ('berat@sjs.com', 'mobil@sjs.com', 'infra@sjs.com', 'manager@sjs.com');

    -- 1. Admin Alat Berat (Heavy Equipment)
    INSERT INTO users (id, email, password_hash, name, role, role_id, department, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'berat@sjs.com',
        password_hash,
        'Admin Alat Berat',
        'admin_alat_berat',
        role_berat,
        'ALAT_BERAT',
        dept_ops,
        org_id,
        true
    );

    -- 2. Admin Kendaraan (Vehicle)
    INSERT INTO users (id, email, password_hash, name, role, role_id, department, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'mobil@sjs.com',
        password_hash,
        'Admin Kendaraan',
        'admin_kendaraan',
        role_kendaraan,
        'KENDARAAN',
        dept_ops,
        org_id,
        true
    );

    -- 3. Admin Infrastruktur (Infrastructure)
    INSERT INTO users (id, email, password_hash, name, role, role_id, department, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'infra@sjs.com',
        password_hash,
        'Admin Infrastruktur',
        'admin_infrastruktur',
        role_infra,
        'INFRASTRUKTUR',
        dept_it,
        org_id,
        true
    );

    -- 4. Manager Aset (Approver)
    INSERT INTO users (id, email, password_hash, name, role, role_id, department, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'manager@sjs.com',
        password_hash,
        'Manager Aset',
        'manager',
        role_manager,
        NULL,
        dept_ops,
        org_id,
        true
    );

    -- 5. Grant asset permissions to manager role
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role_manager, p.id
    FROM permissions p
    WHERE p.code LIKE 'asset.%'
    ON CONFLICT DO NOTHING;

END $$;
