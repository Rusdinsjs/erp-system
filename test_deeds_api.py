import urllib.request
import json

base_url = "http://127.0.0.1:8181"

# 1. Login to get JWT Token
login_payload = json.dumps({"email": "admin@example.com", "password": "123456"}).encode('utf-8')
req_login = urllib.request.Request(f"{base_url}/api/auth/login", data=login_payload, headers={"Content-Type": "application/json"})

with urllib.request.urlopen(req_login) as resp:
    login_res = json.loads(resp.read().decode())
    token = login_res.get("token") or login_res.get("access_token")
    print("LOGIN SUCCESSFUL!")

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# 2. Test GET /api/companies/c0000000-0000-0000-0000-000000000001 (SJS-HQ)
hq_id = "c0000000-0000-0000-0000-000000000001"
print(f"\n--- GET /api/companies/{hq_id} ---")
req_hq = urllib.request.Request(f"{base_url}/api/companies/{hq_id}", headers=headers)
with urllib.request.urlopen(req_hq) as resp:
    data = json.loads(resp.read().decode())
    comp = data.get("data")
    print("STATUS:", resp.status)
    print("NAME:", comp.get("name"))
    print("AKTA PENDIRIAN:")
    print("  - No Akta:", comp.get("establishment_deed_no"))
    print("  - Tgl Akta:", comp.get("establishment_deed_date"))
    print("  - Notaris:", comp.get("establishment_notary_name"))
    print("  - SK Kemenkumham:", comp.get("establishment_approval_no"))
    
    deeds = comp.get("amendment_deeds", [])
    print(f"\nAKTA PERUBAHAN ({len(deeds)} Akta):")
    for d in deeds:
        print(f"  * [No. {d.get('deed_no')}] Tgl: {d.get('deed_date')}, Notaris: {d.get('notary_name')}, SK: {d.get('approval_no')}")
        print(f"    Perubahan: {d.get('description')}")
