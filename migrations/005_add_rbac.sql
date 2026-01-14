-- Migration: 005_add_rbac
-- Description: Add Role-Based Access Control tables
-- Created: 2026-01-07

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions mapping
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- User roles mapping
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    UNIQUE(user_id, role_id, organization_id)
);

-- Insert default roles
INSERT INTO roles (code, name, description, is_system) VALUES
    ('super_admin', 'Super Administrator', 'Full system access', true),
    ('admin', 'Administrator', 'Organization administrator', true),
    ('manager', 'Manager', 'Department/team manager', true),
    ('technician', 'Technician', 'Maintenance technician', true),
    ('staff', 'Staff', 'General staff', true),
    ('user', 'User', 'Basic user access', true)
ON CONFLICT (code) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (code, name, resource, action) VALUES
    -- Asset permissions
    ('asset.create', 'Create Asset', 'asset', 'create'),
    ('asset.read', 'Read Asset', 'asset', 'read'),
    ('asset.update', 'Update Asset', 'asset', 'update'),
    ('asset.delete', 'Delete Asset', 'asset', 'delete'),
    ('asset.transfer', 'Transfer Asset', 'asset', 'transfer'),
    ('asset.dispose', 'Dispose Asset', 'asset', 'dispose'),
    
    -- Maintenance permissions
    ('maintenance.create', 'Create Maintenance', 'maintenance', 'create'),
    ('maintenance.read', 'Read Maintenance', 'maintenance', 'read'),
    ('maintenance.update', 'Update Maintenance', 'maintenance', 'update'),
    ('maintenance.delete', 'Delete Maintenance', 'maintenance', 'delete'),
    ('maintenance.approve', 'Approve Maintenance', 'maintenance', 'approve'),
    
    -- Loan permissions
    ('loan.request', 'Request Loan', 'loan', 'request'),
    ('loan.approve', 'Approve Loan', 'loan', 'approve'),
    ('loan.checkout', 'Checkout Loan', 'loan', 'checkout'),
    ('loan.checkin', 'Checkin Loan', 'loan', 'checkin'),
    
    -- Report permissions
    ('report.view', 'View Reports', 'report', 'read'),
    ('report.export', 'Export Reports', 'report', 'export'),
    
    -- User management
    ('user.create', 'Create User', 'user', 'create'),
    ('user.read', 'Read User', 'user', 'read'),
    ('user.update', 'Update User', 'user', 'update'),
    ('user.delete', 'Delete User', 'user', 'delete')
ON CONFLICT (code) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org ON user_roles(organization_id);

-- Trigger
CREATE TRIGGER update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
