import urllib.request
import json

req = urllib.request.Request("http://127.0.0.1:8080/api/auth/login", data=b'{"email":"admin@example.com","password":"123456"}', headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
token = data["token"]
headers = {"Authorization": f"Bearer {token}"}

for ep in ["/api/employees", "/api/inventory/items"]:
    try:
        r = urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:8080{ep}", headers=headers))
        print(ep, "OK:", r.read().decode()[:200])
    except urllib.error.HTTPError as e:
        print(ep, "Error:", e.code, e.read().decode())
