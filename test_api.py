import urllib.request
import json

req = urllib.request.Request("http://127.0.0.1:8181/api/auth/login", data=b'{"email":"admin@example.com","password":"123456"}', headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
data = json.loads(res.read().decode())
token = data["token"]
headers = {"Authorization": f"Bearer {token}"}

endpoints = [
    ("/api/assets", "Assets"),
    ("/api/categories", "Categories"),
    ("/api/employees", "Employees"),
    ("/api/departments", "Departments"),
    ("/api/locations", "Locations"),
    ("/api/inventory/items", "Inventory Items"),
]

for ep, label in endpoints:
    try:
        r = urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:8181{ep}", headers=headers))
        d = json.loads(r.read().decode())
        items = d.get("data", []) if isinstance(d, dict) else d
        cnt = len(items) if isinstance(items, list) else 0
        print(f"[OK] {label}: {cnt} items returned")
    except Exception as e:
        print(f"[ERR] {label}: {e}")
