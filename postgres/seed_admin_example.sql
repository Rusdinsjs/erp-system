INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000099',
    'admin@example.com',
    '$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU',
    'Admin User',
    'super_admin',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE SET 
    password_hash = EXCLUDED.password_hash,
    is_active = true;
