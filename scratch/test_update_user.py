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

# 2. List users to find target user
req_users = urllib.request.Request(f"{base_url}/users?limit=50", headers=headers)
with urllib.request.urlopen(req_users) as resp:
    users_data = json.loads(resp.read().decode('utf-8'))['data']

target_user = next((u for u in users_data if u['email'] == 'staff@example.com'), None)
print("Target user before update:", target_user)

if target_user:
    user_id = target_user['id']
    # Edit target user with department and asset group restriction
    edit_payload = json.dumps({
        "name": "General Staff Updated",
        "role_code": "staff",
        "department": "Operations",
        "allowed_asset_group": "KENDARAAN",
        "is_active": True
    }).encode('utf-8')
    
    req_update = urllib.request.Request(f"{base_url}/users/{user_id}", data=edit_payload, headers=headers, method='PUT')
    try:
        with urllib.request.urlopen(req_update) as resp:
            updated_res = json.loads(resp.read().decode('utf-8'))
            print("\nUpdate Response:", updated_res)
    except Exception as e:
        print("\nUpdate Failed:", e)
        if hasattr(e, 'read'):
            print(e.read().decode('utf-8'))

    # Re-fetch users list to verify persistence
    with urllib.request.urlopen(req_users) as resp:
        re_fetched = json.loads(resp.read().decode('utf-8'))['data']
        updated_user = next((u for u in re_fetched if u['id'] == user_id), None)
        print("\nTarget user after re-fetching:", updated_user)
