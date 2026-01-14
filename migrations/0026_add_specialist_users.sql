-- Migration: 0026_add_specialist_users
-- Description: Add users for specialist roles (Heavy Eq, Vehicle, Infra, Supervisor)
-- Created: 2026-01-13

DO $$
DECLARE
    org_id UUID := '11111111-1111-1111-1111-111111111111';
    dept_ops UUID := '22222222-2222-2222-2222-222222222204'; -- Operations
    dept_it UUID := '22222222-2222-2222-2222-222222222201'; -- IT
    
    role_heavy UUID;
    role_vehicle UUID;
    role_infra UUID;
    role_supervisor UUID;
    
    -- Hash for 'admin123'
    password_hash VARCHAR := '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ';
BEGIN
    -- Get Role IDs
    SELECT id INTO role_heavy FROM roles WHERE code = 'admin_heavy_eq';
    SELECT id INTO role_vehicle FROM roles WHERE code = 'admin_vehicle';
    SELECT id INTO role_infra FROM roles WHERE code = 'admin_infra';
    SELECT id INTO role_supervisor FROM roles WHERE code = 'supervisor';

    -- 1. Heavy Equipment Admin
    INSERT INTO users (id, email, password_hash, name, role, role_id, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'admin.heavy@example.com',
        password_hash,
        'Admin Alat Berat',
        'admin_heavy_eq', -- Legacy column
        role_heavy,
        dept_ops,
        org_id,
        true
    ) ON CONFLICT (email) DO NOTHING;

    -- 2. Vehicle Admin
    INSERT INTO users (id, email, password_hash, name, role, role_id, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'admin.vehicle@example.com',
        password_hash,
        'Admin Kendaraan',
        'admin_vehicle',
        role_vehicle,
        dept_ops,
        org_id,
        true
    ) ON CONFLICT (email) DO NOTHING;

    -- 3. Infrastructure Admin
    INSERT INTO users (id, email, password_hash, name, role, role_id, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'admin.infra@example.com',
        password_hash,
        'Admin Infrastruktur',
        'admin_infra',
        role_infra,
        dept_it, -- Maybe IT or Ops? Let's use IT for infra usually (network etc) or OPS for building. Using OPS for physical infra consistency.
        org_id,
        true
    ) ON CONFLICT (email) DO NOTHING;

    -- 4. Supervisor
    INSERT INTO users (id, email, password_hash, name, role, role_id, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'supervisor@example.com',
        password_hash,
        'Supervisor Operasional',
        'supervisor',
        role_supervisor,
        dept_ops,
        org_id,
        true
    ) ON CONFLICT (email) DO NOTHING;

END $$;
