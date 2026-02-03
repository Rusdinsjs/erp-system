INSERT INTO permissions (id, code, name, description, resource, action, created_at) VALUES
(gen_random_uuid(), 'roles:view', 'View Roles', 'View system roles', 'roles', 'view', NOW()),
(gen_random_uuid(), 'roles:create', 'Create Roles', 'Create new roles', 'roles', 'create', NOW()),
(gen_random_uuid(), 'roles:edit', 'Edit Roles', 'Edit existing roles', 'roles', 'edit', NOW()),
(gen_random_uuid(), 'roles:delete', 'Delete Roles', 'Delete roles', 'roles', 'delete', NOW()),
(gen_random_uuid(), 'approval_workflows:view', 'View Workflow Settings', 'View approval workflow settings', 'approval_workflows', 'view', NOW()),
(gen_random_uuid(), 'approval_workflows:create', 'Create Workflow Settings', 'Create approval workflow settings', 'approval_workflows', 'create', NOW()),
(gen_random_uuid(), 'approval_workflows:edit', 'Edit Workflow Settings', 'Edit approval workflow settings', 'approval_workflows', 'edit', NOW()),
(gen_random_uuid(), 'approval_workflows:delete', 'Delete Workflow Settings', 'Delete approval workflow settings', 'approval_workflows', 'delete', NOW())
ON CONFLICT (code) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.role_level = 1
AND p.resource IN ('roles', 'approval_workflows')
ON CONFLICT DO NOTHING;
