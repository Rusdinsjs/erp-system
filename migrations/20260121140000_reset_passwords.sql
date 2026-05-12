-- Migration: Reset Passwords to 123456
-- Description: Updates all seed users request password reset to simple '123456'
-- Created: 2026-01-21

-- New Hash for '123456': 
-- $argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU

UPDATE users 
SET password_hash = '$argon2id$v=19$m=19456,t=2,p=1$am15RFJiftnmAqQxPB4vyA$2VTUCevB1dsOPNwjg0A1P4QkUgKOAyr3V35JF3AN2WU'
WHERE email IN (
    'admin@example.com',
    'manager@example.com',
    'technician@example.com',
    'user@example.com'
);
