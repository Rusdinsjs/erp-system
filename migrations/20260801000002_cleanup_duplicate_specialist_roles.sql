-- Migration: Cleanup duplicate Level 5 specialist admin roles
-- All specialist admin roles (Admin Alat Berat, Admin Infrastruktur, Admin Kendaraan) 
-- belong strictly to Level 4 (Admin Level).

-- 0. Ensure canonical Level 4 roles exist (self-heal DBs where 014 data is missing)
INSERT INTO roles (code, name, description, role_level, is_system)
SELECT v.code, v.name, v.description, 4, true
FROM (VALUES
    ('admin_heavy_eq', 'Admin Alat Berat', 'Specialist Admin for Heavy Equipment'),
    ('admin_infra', 'Admin Infrastruktur', 'Specialist Admin for Infrastructure'),
    ('admin_vehicle', 'Admin Kendaraan', 'Specialist Admin for Vehicles')
) AS v(code, name, description)
WHERE NOT EXISTS (SELECT 1 FROM roles r WHERE r.code = v.code);

-- 1. Copy permissions from duplicate Level 5 roles to primary Level 4 roles
INSERT INTO role_permissions (role_id, permission_id)
SELECT r_target.id, rp.permission_id
FROM role_permissions rp
JOIN roles r_src ON rp.role_id = r_src.id
JOIN roles r_target ON (
    (r_src.code = 'admin_alat_berat' AND r_target.code = 'admin_heavy_eq') OR
    (r_src.code = 'admin_infrastruktur' AND r_target.code = 'admin_infra') OR
    (r_src.code = 'admin_kendaraan' AND r_target.code = 'admin_vehicle')
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Delete permissions associated with Level 5 duplicate role codes
DELETE FROM role_permissions WHERE role_id IN (
    SELECT id FROM roles WHERE code IN ('admin_alat_berat', 'admin_infrastruktur', 'admin_kendaraan')
);

-- 2.5 Reassign users still referencing duplicate Level 5 roles to primary Level 4 roles
UPDATE users u
SET role_id = r_target.id
FROM roles r_src
JOIN roles r_target ON (
    (r_src.code = 'admin_alat_berat' AND r_target.code = 'admin_heavy_eq') OR
    (r_src.code = 'admin_infrastruktur' AND r_target.code = 'admin_infra') OR
    (r_src.code = 'admin_kendaraan' AND r_target.code = 'admin_vehicle')
)
WHERE u.role_id = r_src.id
  AND r_src.code IN ('admin_alat_berat', 'admin_infrastruktur', 'admin_kendaraan');

-- 3. Delete duplicate Level 5 role entries from roles table
DELETE FROM roles WHERE code IN ('admin_alat_berat', 'admin_infrastruktur', 'admin_kendaraan');
