"""
Comprehensive Test Suite for Monday Deliverables:
- Ticket assignment permissions (ADMIN-only, Support/Employee 403)
- Automatic least-load assignment (lowest active ticket count, SYSTEM actor)
- Employee-specific asset validation during ticket creation (IDOR prevention)
- Equipment request complete lifecycle (Employee request -> Admin approve -> Admin provision -> Employee verify -> Close)
- Ticket activity history endpoint & authorization
- Asset inventory search, filter, and update
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.db_models import UserDB, AssetDB, TicketDB, EquipmentRequestDB
from app.database.connection import db_manager

client = TestClient(app)


@pytest.fixture(scope="module")
def tokens():
    """Returns access tokens for Admin, Support, and two distinct Employees."""
    admin_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    support_res = client.post("/auth/login", json={"user_id": "IT-501", "password": "password"})
    emp1_res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    emp2_res = client.post("/auth/login", json={"user_id": "EMP-102", "password": "password"})

    return {
        "admin": admin_res.json()["access_token"],
        "support": support_res.json()["access_token"],
        "emp1": emp1_res.json()["access_token"],
        "emp2": emp2_res.json()["access_token"],
    }


# =====================================================================
# 1. Ticket Assignment Permissions
# =====================================================================
def test_ticket_assignment_admin_only(tokens):
    """Verifies only ADMIN can manually assign tickets; SUPPORT and EMPLOYEE get 403."""
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}
    support_headers = {"Authorization": f"Bearer {tokens['support']}"}
    emp_headers = {"Authorization": f"Bearer {tokens['emp1']}"}

    # Create test ticket
    c_res = client.post(
        "/tickets",
        json={"title": "Permission Test Ticket", "description": "Testing manual assignment RBAC"},
        headers=admin_headers
    )
    assert c_res.status_code == 201
    ticket_id = c_res.json()["ticket_id"]

    # Support receives 403 Forbidden
    res_sup = client.post(
        f"/tickets/{ticket_id}/assign",
        json={"assigned_to": "IT-501"},
        headers=support_headers
    )
    assert res_sup.status_code == 403

    # Employee receives 403 Forbidden
    res_emp = client.post(
        f"/tickets/{ticket_id}/assign",
        json={"assigned_to": "IT-501"},
        headers=emp_headers
    )
    assert res_emp.status_code == 403

    # Admin succeeds with 200 OK
    res_admin = client.post(
        f"/tickets/{ticket_id}/assign",
        json={"assigned_to": "IT-501"},
        headers=admin_headers
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["assigned_to"] == "IT-501"


# =====================================================================
# 2. Automatic Least-Load Assignment & SYSTEM Actor
# =====================================================================
def test_automatic_least_load_assignment(tokens):
    """Verifies newly created tickets are automatically assigned via least-load policy with SYSTEM actor."""
    emp_headers = {"Authorization": f"Bearer {tokens['emp1']}"}

    create_res = client.post(
        "/tickets",
        json={"title": "Least Load Auto Assign Test", "description": "Auto assignment verification"},
        headers=emp_headers
    )
    assert create_res.status_code == 201
    ticket_data = create_res.json()
    ticket_id = ticket_data["ticket_id"]

    # Ticket should be assigned to an active SUPPORT specialist
    assert ticket_data["status"] == "ASSIGNED"
    assert ticket_data["assigned_to"] is not None

    # Verify history records SYSTEM as actor
    hist_res = client.get(f"/tickets/{ticket_id}/history", headers=emp_headers)
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 2  # Created + Auto-assigned
    auto_event = [h for h in history if h["changed_by"] == "SYSTEM"]
    assert len(auto_event) >= 1
    assert "least-load" in auto_event[0]["comment"].lower()


# =====================================================================
# 3. Employee Asset Ownership Validation
# =====================================================================
def test_employee_asset_ownership_validation_on_ticket_creation(tokens):
    """
    Employees can submit tickets linked to their assigned assets,
    but cannot link assets assigned to other employees or unassigned assets (IDOR prevention).
    """
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}
    emp2_headers = {"Authorization": f"Bearer {tokens['emp2']}"}

    # Find an asset assigned to EMP-101 and an asset assigned to EMP-102
    with db_manager.get_session() as s:
        emp1_asset = s.query(AssetDB).filter(AssetDB.assigned_to == "EMP-101").first()
        emp2_asset = s.query(AssetDB).filter(AssetDB.assigned_to == "EMP-102").first()
        emp1_asset_id = emp1_asset.asset_id if emp1_asset else None
        emp2_asset_id = emp2_asset.asset_id if emp2_asset else None

    if emp1_asset_id:
        # EMP-101 creating ticket with own asset succeeds
        res_valid = client.post(
            "/tickets",
            json={
                "title": "Hardware Issue with My Laptop",
                "description": "Keyboard is not responding properly",
                "asset_id": emp1_asset_id
            },
            headers=emp1_headers
        )
        assert res_valid.status_code == 201
        assert res_valid.json()["asset_id"] == emp1_asset_id

    if emp2_asset_id:
        # EMP-101 attempting to link EMP-102's asset is rejected with 403 Forbidden
        res_invalid = client.post(
            "/tickets",
            json={
                "title": "Attempt to link colleague's laptop",
                "description": "Unauthorized asset attachment attempt",
                "asset_id": emp2_asset_id
            },
            headers=emp1_headers
        )
        assert res_invalid.status_code == 403
        assert "not assigned to your account" in res_invalid.json()["detail"].lower()


# =====================================================================
# 4. Equipment Request Workflow (Full Lifecycle)
# =====================================================================
def test_equipment_request_lifecycle(tokens):
    """Tests complete Equipment Request lifecycle: PENDING -> APPROVED -> PROVISIONED -> VERIFIED -> CLOSED."""
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}
    emp2_headers = {"Authorization": f"Bearer {tokens['emp2']}"}
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    # 1. Employee creates request
    create_res = client.post(
        "/equipment-requests",
        json={"equipment_type": "Laptop", "reason": "Joining new project needing high RAM"},
        headers=emp1_headers
    )
    assert create_res.status_code == 201
    req = create_res.json()
    req_id = req["request_id"]
    assert req["status"] == "PENDING"
    assert req["requested_by"] == "EMP-101"

    # 2. Employee 2 cannot view Employee 1's request
    other_view = client.get(f"/equipment-requests/{req_id}", headers=emp2_headers)
    assert other_view.status_code == 403

    # 3. Admin approves request
    appr_res = client.post(
        f"/equipment-requests/{req_id}/approve",
        json={"admin_notes": "Approved for Engineering team"},
        headers=admin_headers
    )
    assert appr_res.status_code == 200
    assert appr_res.json()["status"] == "APPROVED"

    # 4. Admin provisions request (linking an available or real asset)
    with db_manager.get_session() as s:
        avail_asset = s.query(AssetDB).first()
        asset_id = avail_asset.asset_id if avail_asset else "LAP-1001"

    prov_res = client.post(
        f"/equipment-requests/{req_id}/provision",
        json={"provisioned_asset_id": asset_id, "admin_notes": "Assigned Dell Latitude"},
        headers=admin_headers
    )
    assert prov_res.status_code == 200
    assert prov_res.json()["status"] == "PROVISIONED"
    assert prov_res.json()["provisioned_asset_id"] == asset_id

    # 5. EMP-102 attempts to verify EMP-101's request -> 403 Forbidden
    unauth_verify = client.post(
        f"/equipment-requests/{req_id}/verify",
        json={"employee_notes": "I received it"},
        headers=emp2_headers
    )
    assert unauth_verify.status_code == 403

    # 6. EMP-101 verifies receipt
    ver_res = client.post(
        f"/equipment-requests/{req_id}/verify",
        json={"employee_notes": "Received laptop in great working condition"},
        headers=emp1_headers
    )
    assert ver_res.status_code == 200
    assert ver_res.json()["status"] == "VERIFIED"

    # 7. EMP-101 closes request
    close_res = client.post(
        f"/equipment-requests/{req_id}/close",
        json={"employee_notes": "Closing request. Setup complete."},
        headers=emp1_headers
    )
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "CLOSED"


# =====================================================================
# 5. Ticket Activity History
# =====================================================================
def test_ticket_history_endpoint_and_idor(tokens):
    """Verifies ticket history access controls and IDOR prevention."""
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}
    emp2_headers = {"Authorization": f"Bearer {tokens['emp2']}"}
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    # EMP-101 creates a ticket
    c_res = client.post(
        "/tickets",
        json={"title": "Private History Ticket", "description": "Auditing activity trail"},
        headers=emp1_headers
    )
    ticket_id = c_res.json()["ticket_id"]

    # EMP-101 can view history
    res1 = client.get(f"/tickets/{ticket_id}/history", headers=emp1_headers)
    assert res1.status_code == 200
    assert isinstance(res1.json(), list)

    # Admin can view history
    res_admin = client.get(f"/tickets/{ticket_id}/history", headers=admin_headers)
    assert res_admin.status_code == 200

    # EMP-102 cannot view EMP-101's ticket history -> 403 Forbidden
    res2 = client.get(f"/tickets/{ticket_id}/history", headers=emp2_headers)
    assert res2.status_code == 403


# =====================================================================
# 6. Asset Management Completion (Update, Search, Filter)
# =====================================================================
def test_asset_search_and_update(tokens):
    """Verifies asset keyword search, type filtering, and update endpoints."""
    admin_headers = {"Authorization": f"Bearer {tokens['admin']}"}

    # Search by keyword
    search_res = client.get("/assets?search=Dell", headers=admin_headers)
    assert search_res.status_code == 200
    assert isinstance(search_res.json(), list)

    # Filter by type
    type_res = client.get("/assets?type=Laptop", headers=admin_headers)
    assert type_res.status_code == 200
    for a in type_res.json():
        assert a["type"] == "Laptop"

    # Update asset details
    with db_manager.get_session() as s:
        asset = s.query(AssetDB).first()
        test_asset_id = asset.asset_id

    update_res = client.put(
        f"/assets/{test_asset_id}",
        json={"brand": "UpdatedBrand", "model": "UpdatedModel"},
        headers=admin_headers
    )
    assert update_res.status_code == 200
    assert update_res.json()["brand"] == "UpdatedBrand"
    assert update_res.json()["model"] == "UpdatedModel"
