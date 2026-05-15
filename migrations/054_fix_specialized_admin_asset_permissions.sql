-- Migration: 045_fix_specialized_admin_asset_permissions
-- Description: Grant asset permissions to specialized admin roles (vehicle, heavy equipment, infra)
-- Created: 2026-05-15

-- Admin Kendaraan
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'admin_vehicle' AND p.code IN ('asset.read', 'asset.create', 'asset.update')
ON CONFLICT DO NOTHING;

-- Admin Alat Berat
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'admin_heavy_eq' AND p.code IN ('asset.read', 'asset.create', 'asset.update')
ON CONFLICT DO NOTHING;

-- Admin Infrastruktur
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.code = 'admin_infra' AND p.code IN ('asset.read', 'asset.create', 'asset.update')
ON CONFLICT DO NOTHING;
