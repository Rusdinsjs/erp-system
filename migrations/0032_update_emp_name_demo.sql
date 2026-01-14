-- Migration: 0032_update_emp_name_demo
-- Description: Update one employee name to demonstrate difference from User name
-- Created: 2026-01-13

UPDATE employees SET name = 'System Administrator (Emp)' WHERE email = 'admin@example.com';
