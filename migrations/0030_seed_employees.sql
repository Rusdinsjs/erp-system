-- Migration: 0030_seed_employees
-- Description: Seed 10 employees, with some linked to existing users
-- Created: 2026-01-13

DO $$
DECLARE
    dept_it UUID := '22222222-2222-2222-2222-222222222201';
    dept_hr UUID := '22222222-2222-2222-2222-222222222202';
    dept_finance UUID := '22222222-2222-2222-2222-222222222203';
    dept_ops UUID := '22222222-2222-2222-2222-222222222204';
BEGIN
    -- 1. Linked to 'admin.heavy@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP001', 'Admin Alat Berat', 'admin.heavy@example.com', '081234567890', dept_ops, 'Heavy Equipment Admin', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 2. Linked to 'admin.vehicle@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP002', 'Admin Kendaraan', 'admin.vehicle@example.com', '081234567891', dept_ops, 'Vehicle Admin', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 3. Linked to 'staff@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP003', 'General Staff', 'staff@example.com', '081234567892', dept_ops, 'Staff Operasional', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 4. Linked to 'supervisor@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP004', 'Supervisor Operasional', 'supervisor@example.com', '081234567893', dept_ops, 'Supervisor', 'pkwtt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 5. Linked to 'org.admin@example.com'
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP005', 'Organization Admin', 'org.admin@example.com', '081234567894', dept_hr, 'HR Manager', 'pkwtt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 6. Random Employee 1
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP006', 'Budi Santoso', 'budi.s@example.com', '081298765432', dept_it, 'IT Support', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 7. Random Employee 2
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP007', 'Siti Aminah', 'siti.a@example.com', '081298765433', dept_finance, 'Finance Staff', 'pkwtt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 8. Random Employee 3
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP008', 'Rudi Hartono', 'rudi.h@example.com', '081298765434', dept_ops, 'Technician', 'magang', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 9. Random Employee 4
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP009', 'Dewi Lestari', 'dewi.l@example.com', '081298765435', dept_hr, 'Recruiter', 'pkwt', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- 10. Random Employee 5
    INSERT INTO employees (id, nik, name, email, phone, department_id, position, employment_status, is_active, created_at, updated_at)
    VALUES (gen_random_uuid(), 'EMP010', 'Eko Purnomo', 'eko.p@example.com', '081298765436', dept_ops, 'Driver', 'lainnya', true, NOW(), NOW())
    ON CONFLICT (nik) DO NOTHING;

    -- Link users to employees by email
    UPDATE employees
    SET user_id = users.id
    FROM users
    WHERE employees.email = users.email;

    -- Also update users table to link back (if we had a column there, but we don't seem to have added employee_id to users table in DB yet, only in UserClaims logic? 
    -- Wait, looking at previous tasks: "Add employee_id to UserClaims in user.rs". Did we add it to the DB table?
    -- I should check if I missed a migration column for `users.employee_id`. 
    -- The user request was "link with users yang ada (email Pegawai == users exist)". 
    -- My implementation plan said: "Backend: Update UserClaims to include employee_id". 
    -- "Backend Adaptation: Loan entity, LoanRequest DTO... updated to handle employee_id".
    -- I checked `0026` and `0027` but I didn't verify if `users` table has `employee_id`.
    -- `UserClaims` having it means the token has it. Where does it come from? 
    -- `AuthService` fetches it: "In login, query employees table using user_id".
    -- Ah, `AuthService` looks up `Employee` by `user_id`. So the link is on `employees.user_id`.
    -- So `UPDATE employees SET user_id = users.id` is correct.
    -- The `users` table doesn't necessarily need `employee_id` if the relationship is managed on `employees` side (One-to-One or One-to-Many).
    -- Based on `employee_service.rs` `create_user`, it sets `employee.user_id = user.id`.
    -- So the link is indeed on the `employees` table.
    
END $$;
