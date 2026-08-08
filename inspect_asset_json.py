import urllib.request
import json

req = urllib.request.Request("http://127.0.0.1:8080/api/auth/login", data=b'{"email":"admin@example.com","password":"123456"}', headers={"Content-Type": "application/json"})
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode())["token"]

req_assets = urllib.request.Request("http://127.0.0.1:8080/api/assets", headers={"Authorization": f"Bearer {token}"})
assets_resp = json.loads(urllib.request.urlopen(req_assets).read().decode())

assets = assets_resp.get("data", [])
for a in assets:
    if a.get('photo_url') or a.get('photos'):
        print(f"ID: {a.get('id')} | Code: {a.get('asset_code')} | Name: {a.get('name')}")
        print(f"  photo_url: {a.get('photo_url')}")
        print(f"  photos: {a.get('photos')}")
