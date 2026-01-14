-- Migration: 0027_add_remaining_users
-- Description: Add users for remaining roles (Org Admin, Staff)
-- Created: 2026-01-13

DO $$
DECLARE
    org_id UUID := '11111111-1111-1111-1111-111111111111';
    dept_ops UUID := '22222222-2222-2222-2222-222222222204'; -- Operations
    dept_hr UUID := '22222222-2222-2222-2222-222222222202'; -- HR
    
    role_admin UUID;
    role_staff UUID;
    
    -- Hash for 'admin123'
    password_hash VARCHAR := '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ';
BEGIN
    -- Get Role IDs
    SELECT id INTO role_admin FROM roles WHERE code = 'admin';
    SELECT id INTO role_staff FROM roles WHERE code = 'staff';

    -- 1. Organization Admin
    INSERT INTO users (id, email, password_hash, name, role, role_id, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'org.admin@example.com',
        password_hash,
        'Organization Admin',
        'admin',
        role_admin,
        dept_hr, -- HR is often admin-like
        org_id,
        true
    ) ON CONFLICT (email) DO NOTHING;

    -- 2. General Staff
    INSERT INTO users (id, email, password_hash, name, role, role_id, department_id, organization_id, is_active)
    VALUES (
        gen_random_uuid(),
        'staff@example.com',
        password_hash,
        'General Staff',
        'staff',
        role_staff,
        dept_ops,
        org_id,
        true
    ) ON CONFLICT (email) DO NOTHING;

END $$;
