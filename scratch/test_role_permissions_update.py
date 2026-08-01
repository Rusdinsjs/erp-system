import urllib.request
import json

base_url = "http://127.0.0.1:8080/api"

# 1. Login as super_admin
data = json.dumps({"email": "admin@example.com", "password": "123456"}).encode('utf-8')
req = urllib.request.Request(f"{base_url}/auth/login", data=data, headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    token = res['token']

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# 2. List Roles & Permissions
req_roles = urllib.request.Request(f"{base_url}/rbac/roles", headers=headers)
with urllib.request.urlopen(req_roles) as resp:
    roles = json.loads(resp.read().decode('utf-8'))

req_perms = urllib.request.Request(f"{base_url}/rbac/permissions", headers=headers)
with urllib.request.urlopen(req_perms) as resp:
    perms = json.loads(resp.read().decode('utf-8'))

supervisor_role = next((r for r in roles if r['code'] == 'supervisor' or r['name'] == 'Supervisor'), None)
print("Supervisor role:", supervisor_role)

if supervisor_role:
    role_id = supervisor_role['id']
    # Select some permission IDs to assign
    asset_read = next((p for p in perms if p['code'] == 'asset.read'), None)
    work_order_read = next((p for p in perms if p['code'] == 'work_order.read'), None)
    inventory_read = next((p for p in perms if p['code'] == 'inventory.read'), None)
    
    assigned_perm_ids = [p['id'] for p in [asset_read, work_order_read, inventory_read] if p]
    
    # Update permissions for supervisor
    update_data = json.dumps({"permission_ids": assigned_perm_ids}).encode('utf-8')
    req_update = urllib.request.Request(f"{base_url}/rbac/roles/{role_id}/permissions", data=update_data, headers=headers, method='POST')
    
    with urllib.request.urlopen(req_update) as resp:
        print("Update response status:", resp.status)

    # Now login as supervisor@example.com and check JWT claims
    sup_login_data = json.dumps({"email": "supervisor@example.com", "password": "123456"}).encode('utf-8')
    req_sup_login = urllib.request.Request(f"{base_url}/auth/login", data=sup_login_data, headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req_sup_login) as resp:
        sup_res = json.loads(resp.read().decode('utf-8'))
        print("Supervisor logged in successfully!")
        print("Supervisor token received.")

