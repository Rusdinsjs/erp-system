-- ============================================
-- Work Order RBAC Enhancement Migration
-- ============================================

-- 1. Add Work Order RBAC columns to maintenance_records
ALTER TABLE maintenance_records 
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'not_required',
    ADD COLUMN IF NOT EXISTS cost_threshold_exceeded BOOLEAN DEFAULT FALSE;

-- Create index for assigned_to lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_to ON maintenance_records(assigned_to);
CREATE INDEX IF NOT EXISTS idx_maintenance_approval_status ON maintenance_records(approval_status);

-- 2. Preventive Maintenance Schedules Table
CREATE TABLE IF NOT EXISTS preventive_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    maintenance_type_id INTEGER REFERENCES maintenance_types(id),
    
    -- Schedule Configuration
    name VARCHAR(255) NOT NULL,
    interval_type VARCHAR(20) NOT NULL CHECK (interval_type IN ('days', 'km', 'hours')),
    interval_value INTEGER NOT NULL,
    
    -- Tracking
    last_execution_date DATE,
    last_execution_odometer INTEGER,
    next_due_date DATE,
    next_due_odometer INTEGER,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    notification_days_before INTEGER DEFAULT 7,
    
    -- Timestamps
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_preventive_schedule_asset ON preventive_schedules(asset_id);
CREATE INDEX IF NOT EXISTS idx_preventive_schedule_next_due ON preventive_schedules(next_due_date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_preventive_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_preventive_schedule_updated_at ON preventive_schedules;
CREATE TRIGGER update_preventive_schedule_updated_at
    BEFORE UPDATE ON preventive_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_preventive_schedule_updated_at();

-- 3. Seed Work Order Permissions
INSERT INTO permissions (code, name, resource, action) VALUES
    ('work_order.create', 'Create Work Order', 'work_order', 'create'),
    ('work_order.read', 'Read Work Order', 'work_order', 'read'),
    ('work_order.read_all', 'Read All Work Orders', 'work_order', 'read_all'),
    ('work_order.update', 'Update Work Order', 'work_order', 'update'),
    ('work_order.delete', 'Delete Work Order', 'work_order', 'delete'),
    ('work_order.approve_cost', 'Approve Work Order Cost', 'work_order', 'approve_cost'),
    ('work_order.assign', 'Assign Technician', 'work_order', 'assign'),
    ('preventive_schedule.create', 'Create Preventive Schedule', 'preventive_schedule', 'create'),
    ('preventive_schedule.read', 'Read Preventive Schedule', 'preventive_schedule', 'read'),
    ('preventive_schedule.update', 'Update Preventive Schedule', 'preventive_schedule', 'update'),
    ('preventive_schedule.delete', 'Delete Preventive Schedule', 'preventive_schedule', 'delete')
ON CONFLICT (code) DO NOTHING;

-- 4. Assign Permissions to Roles
-- Super Admin - All permissions (already has wildcard)
-- Manager - Full access + approve cost
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'manager' 
  AND p.code IN ('work_order.create', 'work_order.read', 'work_order.read_all', 
                 'work_order.update', 'work_order.delete', 'work_order.approve_cost', 
                 'work_order.assign', 'preventive_schedule.create', 'preventive_schedule.read',
                 'preventive_schedule.update', 'preventive_schedule.delete')
ON CONFLICT DO NOTHING;

-- Supervisor - Most access except delete and approve cost
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'supervisor' 
  AND p.code IN ('work_order.create', 'work_order.read', 'work_order.read_all', 
                 'work_order.update', 'work_order.assign',
                 'preventive_schedule.create', 'preventive_schedule.read', 'preventive_schedule.update')
ON CONFLICT DO NOTHING;

-- Technician - Read assigned, update status only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'technician' 
  AND p.code IN ('work_order.read', 'work_order.update')
ON CONFLICT DO NOTHING;

-- Admin Specialist (all 3 types) - Create, Read, Update
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code IN ('admin_heavy_equipment', 'admin_vehicles', 'admin_infrastructure') 
  AND p.code IN ('work_order.create', 'work_order.read', 'work_order.read_all', 
                 'work_order.update', 'preventive_schedule.read')
ON CONFLICT DO NOTHING;

-- Viewer - Read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p 
WHERE r.code = 'viewer' 
  AND p.code IN ('work_order.read', 'work_order.read_all', 'preventive_schedule.read')
ON CONFLICT DO NOTHING;

-- 5. Insert sample maintenance types if not exist
INSERT INTO maintenance_types (code, name, is_preventive) VALUES
    ('ROUTINE', 'Servis Rutin/Berkala', TRUE),
    ('REPAIR', 'Perbaikan/Corrective', FALSE),
    ('INSPECTION', 'Inspeksi/Pemeriksaan', TRUE),
    ('OVERHAUL', 'Overhaul/Perbaikan Besar', FALSE),
    ('ADMIN', 'Administrasi (KIR/STNK/Pajak)', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 6. Add approval workflow configuration for Work Order (Optional - Configure via Admin UI)
-- INSERT INTO approval_workflows would go here if schema matches future needs

COMMENT ON COLUMN maintenance_records.approval_status IS 'Values: not_required, pending_approval, approved, rejected';
COMMENT ON COLUMN preventive_schedules.interval_type IS 'Schedule interval type: days, km, hours';
