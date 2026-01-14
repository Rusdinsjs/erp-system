-- Migration: 014_enhanced_rbac
-- Description: Enhanced RBAC with Hierarchy, Approvals and Views
-- Created: 2026-01-09

-- 1. Enhance Roles Table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS role_level INTEGER DEFAULT 5; -- 1: SuperAdmin, 5: Viewer

-- Seed Specialized Roles
INSERT INTO roles (code, name, description, role_level, is_system) VALUES
('admin_heavy_eq', 'Admin Alat Berat', 'Specialist Admin for Heavy Equipment', 4, true),
('admin_vehicle', 'Admin Kendaraan', 'Specialist Admin for Vehicles', 4, true),
('admin_infra', 'Admin Infrastruktur', 'Specialist Admin for Infrastructure', 4, true),
('supervisor', 'Supervisor', 'Technical Supervisor (Approval L1)', 3, true)
ON CONFLICT (code) DO UPDATE SET role_level = EXCLUDED.role_level;

-- Update existing roles levels
UPDATE roles SET role_level = 1 WHERE code = 'super_admin';
UPDATE roles SET role_level = 2 WHERE code = 'manager'; -- Manager (Approval L2)
-- admin is general admin, level 4?
UPDATE roles SET role_level = 4 WHERE code = 'admin';
UPDATE roles SET role_level = 5 WHERE code IN ('user', 'staff', 'technician');

-- 2. Update Users Table to have direct Role FK (Primary Role)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);

-- Migrate existing string roles to role_id
DO $$
DECLARE
    r_record RECORD;
BEGIN
    FOR r_record IN SELECT id, code FROM roles LOOP
        UPDATE users SET role_id = r_record.id WHERE role = r_record.code;
    END LOOP;
END $$;

-- 3. Approval System
CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_type VARCHAR(50) NOT NULL, -- HEAVY_EQ, VEHICLES, INFRASTRUCTURE
    action_type VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, TRANSFER
    need_approval BOOLEAN DEFAULT TRUE,
    approval_level_1_role_id UUID REFERENCES roles(id),
    approval_level_2_role_id UUID REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type VARCHAR(50) NOT NULL, -- ASSET, MAINTENANCE
    resource_id UUID NOT NULL, -- ID of the drafted item or existing item
    action_type VARCHAR(50) NOT NULL,
    requested_by UUID NOT NULL REFERENCES users(id),
    data_snapshot JSONB, -- The data to be applied
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED_L1, APPROVED_L2, REJECTED, CANCELLED
    
    current_approval_level INTEGER DEFAULT 1,
    
    approved_by_l1 UUID REFERENCES users(id),
    approved_at_l1 TIMESTAMPTZ,
    notes_l1 TEXT,
    
    approved_by_l2 UUID REFERENCES users(id),
    approved_at_l2 TIMESTAMPTZ,
    notes_l2 TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Granular Permissions (Seeding)
-- Ensure codes from requirement exist
INSERT INTO permissions (code, name, resource, action) VALUES
('heavy_eq.create', 'Create Heavy Equipment', 'heavy_equipment', 'create'),
('heavy_eq.read', 'Read Heavy Equipment', 'heavy_equipment', 'read'),
('heavy_eq.update', 'Update Heavy Equipment', 'heavy_equipment', 'update'),
('vehicle.create', 'Create Vehicle', 'vehicle', 'create'),
('vehicle.read', 'Read Vehicle', 'vehicle', 'read'),
('vehicle.update', 'Update Vehicle', 'vehicle', 'update'),
('infra.create', 'Create Infrastructure', 'infra', 'create'),
('infra.read', 'Read Infrastructure', 'infra', 'read'),
('infra.update', 'Update Infrastructure', 'infra', 'update')
ON CONFLICT (code) DO NOTHING;

-- Map Permissions to Roles (Simplified Seeding)
-- Admin Alat Berat
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'admin_heavy_eq' AND p.code LIKE 'heavy_eq.%'
ON CONFLICT DO NOTHING;

-- Admin Kendaraan
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'admin_vehicle' AND p.code LIKE 'vehicle.%'
ON CONFLICT DO NOTHING;

-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'super_admin'
ON CONFLICT DO NOTHING;

-- 5. Data Isolation Views
-- View for Heavy Equipment Admin (Only Heavy Equipment Category)
CREATE OR REPLACE VIEW view_heavy_equipment_admin AS
SELECT a.* 
FROM assets a
JOIN categories c ON a.category_id = c.id
WHERE c.code = 'HEAVY_EQ' OR c.parent_id IN (SELECT id FROM categories WHERE code = 'HEAVY_EQ'); 
-- Assuming 'HEAVY_EQ' category code exists. If not, dynamic filtering in App is better, but View requested.

CREATE OR REPLACE VIEW view_vehicles_admin AS
SELECT a.* 
FROM assets a
JOIN categories c ON a.category_id = c.id
WHERE c.code = 'VEHICLES' OR c.parent_id IN (SELECT id FROM categories WHERE code = 'VEHICLES');

CREATE OR REPLACE VIEW view_infrastructure_admin AS
SELECT a.* 
FROM assets a
JOIN categories c ON a.category_id = c.id
WHERE c.code = 'INFRASTRUCTURE' OR c.parent_id IN (SELECT id FROM categories WHERE code = 'INFRASTRUCTURE');

-- Trigger for timestamps
CREATE TRIGGER update_approval_requests_updated_at BEFORE UPDATE ON approval_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
