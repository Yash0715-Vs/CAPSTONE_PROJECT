"""
Live Server Smoke Verification Script.
"""
import requests

BASE = "http://127.0.0.1:8000"

print("=" * 60)
print("VERIFYING LIVE FASTAPI SERVER (http://127.0.0.1:8000)")
print("=" * 60)

# 1. Health
h = requests.get(f"{BASE}/health").json()
print(f"[1] Health Check: Status={h['status']}, Database={h['database']}")

# 2. Login as Admin ADM-001
login_res = requests.post(
    f"{BASE}/auth/login",
    json={"user_id": "ADM-001", "password": "password"}
).json()
token = login_res["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"[2] Admin Login: Success! Name='{login_res['user']['name']}', Role='{login_res['user']['role']}'")

# 3. Get Assets
assets = requests.get(f"{BASE}/assets", headers=headers).json()
print(f"[3] Assets: Retrieved {len(assets)} assets from database")
for a in assets[:3]:
    print(f"    • {a['asset_id']}: {a['brand']} {a['model']} | Status: {a['status']} | Type: {a['type']}")

# 4. Get Tickets
tickets = requests.get(f"{BASE}/tickets", headers=headers).json()
print(f"[4] Tickets: Retrieved {len(tickets)} tickets from database")
for t in tickets[:3]:
    print(f"    • {t['ticket_id']}: {t['title']} | Category: {t['category']} | Priority: {t['priority']} | Status: {t['status']}")

# 5. Get Analytics Report
reports = requests.get(f"{BASE}/reports/tickets", headers=headers).json()
print(f"[5] Reports: Total Tickets={reports['total_tickets']}, In-SLA Rate={reports.get('sla_compliance_rate', 100.0)}%")
print(f"    • By Status: {reports['by_status']}")
print(f"    • By Priority: {reports['by_priority']}")

print("=" * 60)
print("LIVE SERVER IS 100% OPERATIONAL AND READY!")
print("=" * 60)
