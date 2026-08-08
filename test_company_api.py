import urllib.request
import json

login_url = "http://localhost:8181/api/auth/login"
login_payload = {"username": "admin", "password": "password123"}

try:
    req = urllib.request.Request(
        login_url,
        data=json.dumps(login_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    res = urllib.request.urlopen(req)
    resp_data = json.loads(res.read())
    token = resp_data.get("data", {}).get("token") or resp_data.get("token")
    print("Logged in, token obtained")

    list_req = urllib.request.Request(
        "http://localhost:8181/api/companies",
        headers={"Authorization": f"Bearer {token}"}
    )
    res = urllib.request.urlopen(list_req)
    data = json.loads(res.read())
    companies = data.get("data", [])
    print(f"Total companies: {len(companies)}")

    if companies:
        c = companies[0]
        cid = c["id"]
        print(f"Testing update for: {c['name']} ({cid})")

        update_payload = {
            "code": c["code"],
            "name": c["name"],
            "legal_name": c.get("legal_name"),
            "tax_id": c.get("tax_id"),
            "is_group": c.get("is_group", False),
            "status": c.get("status", "ACTIVE"),
            "logo_url": "/api/uploads/2026/08/08/test_logo.png",
            "establishment_deed_date": None,
            "amendment_deeds": []
        }

        put_req = urllib.request.Request(
            f"http://localhost:8181/api/companies/{cid}",
            data=json.dumps(update_payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
            method="PUT"
        )
        put_res = urllib.request.urlopen(put_req)
        print("PUT Result:", put_res.read().decode())
except Exception as e:
    if hasattr(e, 'read'):
        print("HTTP Error response:", e.read().decode())
    else:
        print("Error:", e)
