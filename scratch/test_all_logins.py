import urllib.request
import json

url = "http://127.0.0.1:8080/api/auth/login"
users_to_test = [
    "admin@example.com",
    "admin.heavy@example.com",
    "admin.vehicle@example.com",
    "admin.infra@example.com",
    "supervisor@example.com",
    "org.admin@example.com",
    "staff@example.com",
    "manager@example.com",
    "technician@example.com",
    "user@example.com"
]

all_ok = True
for email in users_to_test:
    data = json.dumps({"email": email, "password": "123456"}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as response:
            res = json.loads(response.read().decode('utf-8'))
            print(f"[{email}] SUCCESS - Role: {res['user']['role']}")
    except Exception as e:
        print(f"[{email}] FAILED: {e}")
        all_ok = False

if all_ok:
    print("\nALL LOGINS WORKING PERFECTLY!")
