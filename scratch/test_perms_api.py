import urllib.request
import json

base_url = "http://127.0.0.1:8080/api"

# Login as super_admin
data = json.dumps({"email": "admin@example.com", "password": "123456"}).encode('utf-8')
req = urllib.request.Request(f"{base_url}/auth/login", data=data, headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    token = res['token']

headers = {'Authorization': f'Bearer {token}'}
req = urllib.request.Request(f"{base_url}/rbac/permissions", headers=headers)

with urllib.request.urlopen(req) as resp:
    perms = json.loads(resp.read().decode('utf-8'))
    print(f"Total permissions returned by API: {len(perms)}")
    resources = set(p['resource'] for p in perms)
    print(f"Total distinct resources: {len(resources)}")
    print(f"Resources sample: {sorted(list(resources))[:15]}")
