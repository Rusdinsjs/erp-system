import urllib.request
import json

base_url = "http://127.0.0.1:8080/api"

# 1. Login
data = json.dumps({"email": "admin.vehicle@example.com", "password": "123456"}).encode('utf-8')
req = urllib.request.Request(f"{base_url}/auth/login", data=data, headers={'Content-Type': 'application/json'})

with urllib.request.urlopen(req) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    token = res['token']
    user = res['user']
    print(f"Logged in as {user['email']} (role: {user['role']})")

headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

# List of endpoints called on launchpad / layout mount
endpoints = [
    "/public-settings",
    "/settings",
    "/notifications",
    "/audit/sessions/active",
    "/users/me",
]

print("\nTesting initial page load API requests:")
for ep in endpoints:
    req = urllib.request.Request(f"{base_url}{ep}", headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"  GET {ep} => {resp.status} OK")
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        print(f"  GET {ep} => {e.code} ERROR: {body}")
    except Exception as e:
        print(f"  GET {ep} => FAILED: {e}")

