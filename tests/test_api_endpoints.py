"""
API Integration Verification Tests.

Tests the FastAPI endpoints using TestClient:
- Health check / root
- Authentication (/auth/login, /auth/me)
- Assets listing (/assets)
- Ticket creation with automatic classification (/tickets)
- Reporting (/reports/tickets)
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.main import app

client = TestClient(app)


def test_api_workflow():
    print("=" * 65)
    print("RUNNING FASTAPI ENDPOINT INTEGRATION TESTS")
    print("=" * 65)

    # 1. Health check
    print("\n[1] Testing Health Endpoint GET /health ...")
    res_root = client.get("/health")
    assert res_root.status_code == 200
    print(f"  -> Response: {res_root.json()}")

    # 2. Login as Employee EMP-101
    print("\n[2] Testing Authentication POST /auth/login ...")
    login_payload = {"user_id": "EMP-101", "password": "password"}
    res_login = client.post("/auth/login", json=login_payload)
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    token_data = res_login.json()
    token = token_data["access_token"]
    print(f"  -> Successfully logged in as {token_data['user']['name']} ({token_data['user']['role']})")
    print(f"  -> JWT Access Token generated: {token[:25]}...")

    headers = {"Authorization": f"Bearer {token}"}

    # 3. GET /auth/me
    print("\n[3] Testing Authenticated Profile GET /auth/me ...")
    res_me = client.get("/auth/me", headers=headers)
    assert res_me.status_code == 200
    print(f"  -> User Profile: {res_me.json()['email']} (Role: {res_me.json()['role']})")

    # 4. GET /assets
    print("\n[4] Testing Assets Retrieval GET /assets ...")
    res_assets = client.get("/assets", headers=headers)
    assert res_assets.status_code == 200
    print(f"  -> Retrieved {len(res_assets.json())} asset(s) assigned to EMP-101")

    # 5. POST /tickets (Auto-Classification test!)
    print("\n[5] Testing Ticket Creation with Auto-Classification POST /tickets ...")
    new_ticket_payload = {
        "title": "WiFi disconnected on 3rd floor",
        "description": "Entire team lost internet connectivity after power surge",
        # Category and priority omitted to trigger auto-classification!
    }
    res_ticket = client.post("/tickets", json=new_ticket_payload, headers=headers)
    assert res_ticket.status_code == 201, f"Create ticket failed: {res_ticket.text}"
    ticket = res_ticket.json()
    print(f"  -> Created Ticket ID: {ticket['ticket_id']}")
    print(f"  -> Inferred Category: {ticket['category']}")
    print(f"  -> Inferred Priority: {ticket['priority']}")
    print(f"  -> Status: {ticket['status']}")

    # 6. Login as Admin ADM-001 for reports
    print("\n[6] Testing Admin Login ADM-001 and GET /reports/tickets ...")
    admin_login = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_reports = client.get("/reports/tickets", headers=admin_headers)
    assert res_reports.status_code == 200
    print(f"  -> Ticket Analytics: {res_reports.json()['total_tickets']} total tickets")
    print(f"  -> By Status: {res_reports.json()['by_status']}")
    print(f"  -> By Category: {res_reports.json()['by_category']}")

    print("\n" + "=" * 65)
    print("ALL FASTAPI INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)


if __name__ == "__main__":
    test_api_workflow()
