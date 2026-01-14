-- Migration: 011_seed_data
-- Description: Initial seed data for development/demo
-- Created: 2026-01-07

-- ============================================
-- ORGANIZATION
-- ============================================

INSERT INTO organizations (id, code, name, org_type, is_active) VALUES
    ('11111111-1111-1111-1111-111111111111', 'HQ', 'Headquarters', 'company', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- UPDATE DEPARTMENTS (add organization_id)
-- ============================================

ALTER TABLE departments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

INSERT INTO departments (id, code, name, organization_id) VALUES
    ('22222222-2222-2222-2222-222222222201', 'IT', 'IT Department', '11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222202', 'HR', 'Human Resources', '11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222203', 'FIN', 'Finance', '11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222204', 'OPS', 'Operations', '11111111-1111-1111-1111-111111111111'),
    ('22222222-2222-2222-2222-222222222205', 'MKT', 'Marketing', '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- ADMIN USER
-- Password: admin123 (hashed with argon2)
-- ============================================

INSERT INTO users (id, email, password_hash, name, role, department_id, organization_id, is_active) VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'admin@example.com',
        '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ',
        'System Administrator',
        'super_admin',
        '22222222-2222-2222-2222-222222222201',
        '11111111-1111-1111-1111-111111111111',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000002',
        'manager@example.com',
        '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ',
        'Asset Manager',
        'manager',
        '22222222-2222-2222-2222-222222222201',
        '11111111-1111-1111-1111-111111111111',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000003',
        'technician@example.com',
        '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ',
        'Maintenance Technician',
        'technician',
        '22222222-2222-2222-2222-222222222204',
        '11111111-1111-1111-1111-111111111111',
        true
    ),
    (
        '00000000-0000-0000-0000-000000000004',
        'user@example.com',
        '$argon2id$v=19$m=19456,t=2,p=1$TP8PZIwf0JaE1YEOZwgGMg$9z4WYIvT8BW65k1G8U05wN5Zun695WsylcWQBpg5bQQ',
        'Regular User',
        'user',
        '22222222-2222-2222-2222-222222222202',
        '11111111-1111-1111-1111-111111111111',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- Assign roles to users
INSERT INTO user_roles (id, user_id, role_id, organization_id)
SELECT gen_random_uuid(), u.id, r.id, u.organization_id
FROM users u
JOIN roles r ON r.code = u.role
WHERE u.id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- LOCATIONS (using 'type' column)
-- ============================================

INSERT INTO locations (id, code, name, type, parent_id) VALUES
    -- Building
    ('33333333-3333-3333-3333-333333333301', 'GEDUNG-A', 'Gedung A', 'Building', NULL),
    ('33333333-3333-3333-3333-333333333302', 'GEDUNG-B', 'Gedung B', 'Building', NULL),
    -- Floors
    ('33333333-3333-3333-3333-333333333311', 'A-LT1', 'Gedung A - Lantai 1', 'Floor', '33333333-3333-3333-3333-333333333301'),
    ('33333333-3333-3333-3333-333333333312', 'A-LT2', 'Gedung A - Lantai 2', 'Floor', '33333333-3333-3333-3333-333333333301'),
    ('33333333-3333-3333-3333-333333333313', 'A-LT3', 'Gedung A - Lantai 3', 'Floor', '33333333-3333-3333-3333-333333333301'),
    -- Rooms
    ('33333333-3333-3333-3333-333333333321', 'A-101', 'Ruang Server', 'Room', '33333333-3333-3333-3333-333333333311'),
    ('33333333-3333-3333-3333-333333333322', 'A-102', 'Ruang IT', 'Room', '33333333-3333-3333-3333-333333333311'),
    ('33333333-3333-3333-3333-333333333323', 'A-201', 'Ruang Meeting', 'Room', '33333333-3333-3333-3333-333333333312'),
    ('33333333-3333-3333-3333-333333333324', 'A-202', 'Ruang Manager', 'Room', '33333333-3333-3333-3333-333333333312')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CATEGORIES (without depreciation columns - will add later)
-- ============================================

INSERT INTO categories (id, code, name, parent_id) VALUES
    -- Main categories
    ('44444444-4444-4444-4444-444444444401', 'IT-EQUIP', 'Peralatan IT', NULL),
    ('44444444-4444-4444-4444-444444444402', 'FURNITURE', 'Furniture', NULL),
    ('44444444-4444-4444-4444-444444444403', 'VEHICLE', 'Kendaraan', NULL),
    ('44444444-4444-4444-4444-444444444404', 'MACHINERY', 'Mesin & Peralatan', NULL),
    ('44444444-4444-4444-4444-444444444405', 'BUILDING', 'Bangunan', NULL),
    -- Sub categories - IT
    ('44444444-4444-4444-4444-444444444411', 'COMPUTER', 'Komputer & Laptop', '44444444-4444-4444-4444-444444444401'),
    ('44444444-4444-4444-4444-444444444412', 'NETWORK', 'Perangkat Jaringan', '44444444-4444-4444-4444-444444444401'),
    ('44444444-4444-4444-4444-444444444413', 'SERVER', 'Server', '44444444-4444-4444-4444-444444444401'),
    ('44444444-4444-4444-4444-444444444414', 'PRINTER', 'Printer & Scanner', '44444444-4444-4444-4444-444444444401'),
    ('44444444-4444-4444-4444-444444444415', 'MONITOR', 'Monitor', '44444444-4444-4444-4444-444444444401'),
    -- Sub categories - Furniture
    ('44444444-4444-4444-4444-444444444421', 'DESK', 'Meja', '44444444-4444-4444-4444-444444444402'),
    ('44444444-4444-4444-4444-444444444422', 'CHAIR', 'Kursi', '44444444-4444-4444-4444-444444444402'),
    ('44444444-4444-4444-4444-444444444423', 'CABINET', 'Lemari', '44444444-4444-4444-4444-444444444402')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VENDORS
-- ============================================

INSERT INTO vendors (id, code, name, contact_person, email, phone, address, is_active) VALUES
    ('55555555-5555-5555-5555-555555555501', 'VEND-001', 'PT Teknologi Maju', 'Budi Santoso', 'budi@tekno.com', '021-5551234', 'Jl. Sudirman No. 123, Jakarta', true),
    ('55555555-5555-5555-5555-555555555502', 'VEND-002', 'CV Mebel Jaya', 'Ani Wijaya', 'ani@mebeljaya.com', '021-5552345', 'Jl. Gatot Subroto No. 45, Jakarta', true),
    ('55555555-5555-5555-5555-555555555503', 'VEND-003', 'PT Servis Prima', 'Dedi Cahyono', 'dedi@servispri.com', '021-5553456', 'Jl. HR Rasuna Said No. 67, Jakarta', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE ASSETS (using existing columns only)
-- ============================================

INSERT INTO assets (id, asset_code, name, category_id, location_id, department_id, vendor_id, status, condition_id, brand, model, serial_number, purchase_date, purchase_price, currency_id, unit_id, quantity, useful_life_months, residual_value, is_rental, organization_id) VALUES
    -- IT Equipment
    ('66666666-6666-6666-6666-666666666601', 'AST-IT-001', 'MacBook Pro 16" M3', '44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'in_inventory', 1, 'Apple', 'MacBook Pro 16"', 'C02YX1234567', '2024-01-15', 35000000, 1, 1, 1, 48, 5000000, false, '11111111-1111-1111-1111-111111111111'),
    
    ('66666666-6666-6666-6666-666666666602', 'AST-IT-002', 'ThinkPad X1 Carbon', '44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'in_inventory', 2, 'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'PF3ABCD1234', '2023-06-20', 25000000, 1, 1, 1, 48, 4000000, false, '11111111-1111-1111-1111-111111111111'),
    
    ('66666666-6666-6666-6666-666666666603', 'AST-IT-003', 'Dell PowerEdge R750', '44444444-4444-4444-4444-444444444413', '33333333-3333-3333-3333-333333333321', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'deployed', 1, 'Dell', 'PowerEdge R750', 'SRV20240001', '2024-02-01', 150000000, 1, 1, 1, 60, 20000000, false, '11111111-1111-1111-1111-111111111111'),
    
    ('66666666-6666-6666-6666-666666666604', 'AST-IT-004', 'Cisco Switch 24 Port', '44444444-4444-4444-4444-444444444412', '33333333-3333-3333-3333-333333333321', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'deployed', 1, 'Cisco', 'Catalyst 9300-24T', 'FCW2134ABCD', '2023-12-10', 45000000, 1, 1, 2, 60, 5000000, false, '11111111-1111-1111-1111-111111111111'),
    
    ('66666666-6666-6666-6666-666666666605', 'AST-IT-005', 'HP LaserJet Pro', '44444444-4444-4444-4444-444444444414', '33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'in_inventory', 2, 'HP', 'LaserJet Pro M428fdn', 'VNB3X12345', '2023-08-15', 8500000, 1, 1, 1, 48, 1000000, false, '11111111-1111-1111-1111-111111111111'),
    
    -- Furniture
    ('66666666-6666-6666-6666-666666666611', 'AST-FRN-001', 'Meja Kerja Executive', '44444444-4444-4444-4444-444444444421', '33333333-3333-3333-3333-333333333324', '22222222-2222-2222-2222-222222222202', '55555555-5555-5555-5555-555555555502', 'deployed', 1, 'Informa', 'Executive Desk 180', NULL, '2023-03-01', 5500000, 1, 1, 1, 96, 500000, false, '11111111-1111-1111-1111-111111111111'),
    
    ('66666666-6666-6666-6666-666666666612', 'AST-FRN-002', 'Kursi Ergonomis', '44444444-4444-4444-4444-444444444422', '33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555502', 'in_inventory', 1, 'Herman Miller', 'Aeron Chair', NULL, '2024-01-10', 18000000, 1, 1, 5, 96, 2000000, false, '11111111-1111-1111-1111-111111111111'),
    
    -- Asset in maintenance
    ('66666666-6666-6666-6666-666666666620', 'AST-IT-010', 'Dell Latitude 5530', '44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333322', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'in_maintenance', 4, 'Dell', 'Latitude 5530', 'LAT5530XYZ', '2022-05-15', 18000000, 1, 1, 1, 48, 3000000, false, '11111111-1111-1111-1111-111111111111'),
    
    -- Asset for loan
    ('66666666-6666-6666-6666-666666666621', 'AST-IT-011', 'Proyektor Epson', '44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333323', '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'in_inventory', 2, 'Epson', 'EB-X51', 'EPX51ABC123', '2023-04-20', 12000000, 1, 1, 1, 48, 1500000, false, '11111111-1111-1111-1111-111111111111'),
    
    -- Disposed asset
    ('66666666-6666-6666-6666-666666666630', 'AST-IT-020', 'Old Desktop PC', '44444444-4444-4444-4444-444444444411', NULL, '22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'retired', 5, 'HP', 'ProDesk 400 G5', 'HPD4005XYZ', '2018-06-01', 8000000, 1, 1, 1, 48, 0, false, '11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SAMPLE WORK ORDERS
-- ============================================

INSERT INTO maintenance_work_orders (id, wo_number, asset_id, wo_type, priority, status, scheduled_date, due_date, problem_description, created_by) VALUES
    ('88888888-8888-8888-8888-888888888801', 'WO-20240107-001', '66666666-6666-6666-6666-666666666620', 'corrective', 'high', 'in_progress', '2024-01-07', '2024-01-10', 'Screen tidak menyala, perlu penggantian', '00000000-0000-0000-0000-000000000002'),
    ('88888888-8888-8888-8888-888888888802', 'WO-20240110-001', '66666666-6666-6666-6666-666666666603', 'preventive', 'medium', 'pending', '2024-01-15', '2024-01-20', 'Scheduled quarterly maintenance', '00000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- Users: 4 (admin, manager, technician, user) - Password: admin123
-- Departments: 5
-- Locations: 9
-- Categories: 13
-- Vendors: 3
-- Assets: 10
-- Work Orders: 2
