import urllib.request
import json

url = "http://127.0.0.1:8080/api/auth/login"
data = json.dumps({"email": "admin@example.com", "password": "123456"}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode('utf-8'))
        print("LOGIN SUCCESSFUL:")
        print("Success:", res.get("success"))
        print("User:", res.get("user"))
        print("Token prefix:", res.get("token")[:20] if res.get("token") else None)
except Exception as e:
    print("LOGIN FAILED:", e)
    if hasattr(e, 'read'):
        print("Response body:", e.read().decode('utf-8'))
