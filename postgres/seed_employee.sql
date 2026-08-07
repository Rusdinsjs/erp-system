INSERT INTO employees (id, nik, name, email, user_id) 
VALUES (
    gen_random_uuid(), 
    'EMP-001', 
    'Admin User', 
    'admin@example.com', 
    '00000000-0000-0000-0000-000000000099'
) 
ON CONFLICT (email) DO UPDATE SET user_id = '00000000-0000-0000-0000-000000000099';
