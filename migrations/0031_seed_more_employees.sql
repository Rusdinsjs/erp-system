-- Migration: 0031_seed_more_employees
-- Description: Seed 5 more employees linked to unlinked users
-- Created: 2026-01-13

DO $$
DECLARE
    dept_it UUID := '22222222-2222-2222-2222-222222222201';
    dept_hr UUID := '22222222-2222-2222-2222-222222222202';
    dept_finance UUID := '22222222-2222-2222-2222-222222222203';
    dept_ops UUID := '22222222-2222-2222-2222-222222222204';
BEGIN
    -- 1. Linked to 'admin@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP011', 'System Administrator', 'admin@example.com', '081234567801', dept_it, 'Super Admin', 'pkwtt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 2. Linked to 'manager@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP012', 'Asset Manager', 'manager@example.com', '081234567802', dept_ops, 'Manager Asset', 'pkwtt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 3. Linked to 'technician@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP013', 'Maintenance Technician', 'technician@example.com', '081234567803', dept_ops, 'Senior Technician', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 4. Linked to 'user@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP014', 'Regular User', 'user@example.com', '081234567804', dept_hr, 'HR Staff', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 5. Linked to 'admin.infra@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP015', 'Admin Infrastruktur', 'admin.infra@example.com', '081234567805', dept_it, 'Infrastructure Admin', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- Link users to employees by email for the newly created ones
    UPDATE employees
    SET user_id = users.id
    FROM users
    WHERE employees.email = users.email
    AND employees.user_id IS NULL;
    
END $$;
