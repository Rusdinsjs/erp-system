-- Migration: 20260521155000_add_indonesian_admin_roles
-- Description: Add Indonesian specialist roles for RBAC

-- Insert the roles into roles table
INSERT INTO roles (code, name, description, is_system) VALUES
    ('admin_alat_berat', 'Admin Alat Berat', 'Administrator for Alat Berat', true),
    ('admin_kendaraan', 'Admin Kendaraan', 'Administrator for Kendaraan', true),
    ('admin_infrastruktur', 'Admin Infrastruktur', 'Administrator for Infrastruktur', true)
ON CONFLICT (code) DO NOTHING;

-- Map permissions for these new roles (same as admin for assets, reading users, etc)
DO $$
DECLARE
    role_berat UUID;
    role_kendaraan UUID;
    role_infra UUID;
BEGIN
    SELECT id INTO role_berat FROM roles WHERE code = 'admin_alat_berat';
    SELECT id INTO role_kendaraan FROM roles WHERE code = 'admin_kendaraan';
    SELECT id INTO role_infra FROM roles WHERE code = 'admin_infrastruktur';

    -- Give them asset read/update/create/delete permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p 
    WHERE r.code IN ('admin_alat_berat', 'admin_kendaraan', 'admin_infrastruktur')
      AND p.code LIKE 'asset.%'
    ON CONFLICT DO NOTHING;

    -- Give them maintenance permissions
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p 
    WHERE r.code IN ('admin_alat_berat', 'admin_kendaraan', 'admin_infrastruktur')
      AND p.code LIKE 'maintenance.%'
    ON CONFLICT DO NOTHING;
    
    -- Give them basic user read
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r, permissions p 
    WHERE r.code IN ('admin_alat_berat', 'admin_kendaraan', 'admin_infrastruktur')
      AND p.code IN ('user.read')
    ON CONFLICT DO NOTHING;
END $$;
