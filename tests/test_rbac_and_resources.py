"""
Phase 3 & 4 Unit Tests: Role-Based Access Control (RBAC) and Resource Security.

Validates:
- Unauthenticated access returns 401.
- Employees receive 403 Forbidden on staff and admin routes.
- Support staff receive 403 on admin-only routes (e.g. deleting assets, user management).
- IDOR prevention: Employee cannot view another user's private ticket.
- IDOR prevention: Employee cannot view assets assigned to another user via query parameters.
- IDOR prevention: Employee cannot close another user's ticket.
- Ticket lifecycle validations (cannot resolve closed ticket, cannot close unresolved ticket).
- Assigning tickets restricted to authorized staff (Support/Admin).
- Asset deletion restricted to Admin.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.db_models import UserDB, AssetDB, TicketDB, UserRole
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


def test_unauthenticated_requests_fail():
    """Unauthenticated access to protected endpoints yields 401."""
    assert client.get("/users").status_code == 401
    assert client.get("/assets").status_code == 401
    assert client.get("/tickets").status_code == 401
    assert client.get("/reports/tickets").status_code == 401


def test_employee_forbidden_from_admin_and_support_endpoints(tokens):
    """Employee receives 403 on administrative endpoints."""
    emp_headers = {"Authorization": f"Bearer {tokens['emp1']}"}

    # Cannot list all users
    res_users = client.get("/users", headers=emp_headers)
    assert res_users.status_code == 403

    # Cannot create asset
    res_create_asset = client.post(
        "/assets",
        json={"asset_id": "LAP-HACK", "type": "Laptop", "brand": "X", "model": "Y", "serial_number": "SN-HACK-01"},
        headers=emp_headers
    )
    assert res_create_asset.status_code == 403

    # Cannot view reports
    res_reports = client.get("/reports/tickets", headers=emp_headers)
    assert res_reports.status_code == 403


def test_support_forbidden_from_admin_only_endpoints(tokens):
    """IT Support specialist receives 403 on Admin-only actions."""
    support_headers = {"Authorization": f"Bearer {tokens['support']}"}

    # Support cannot create or delete user
    res_del_user = client.delete("/users/EMP-105", headers=support_headers)
    assert res_del_user.status_code == 403

    # Support cannot delete asset
    res_del_asset = client.delete("/assets/LAP-1001", headers=support_headers)
    assert res_del_asset.status_code == 403


def test_employee_asset_filtering_prevents_idor(tokens):
    """
    Employees cannot access other employees' assets by manipulating the assigned_to query parameter.
    """
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}

    # EMP-101 requests assets and attempts to query for EMP-102's assets
    res = client.get("/assets?assigned_to=EMP-102", headers=emp1_headers)
    assert res.status_code == 200
    for asset in res.json():
        # System must force assigned_to = EMP-101
        assert asset["assigned_to"] == "EMP-101"


def test_employee_cannot_view_another_employees_asset_detail(tokens):
    """Employees receive 403 when trying to fetch an asset assigned to another person."""
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}

    # Look for an asset in DB assigned to someone other than EMP-101
    with db_manager.get_session() as session:
        other_asset = session.query(AssetDB).filter(
            AssetDB.assigned_to.isnot(None),
            AssetDB.assigned_to != "EMP-101"
        ).first()
        asset_id = other_asset.asset_id if other_asset else None

    if asset_id:
        res = client.get(f"/assets/{asset_id}", headers=emp1_headers)
        assert res.status_code == 403
        assert "not authorized" in res.json()["detail"].lower()


def test_employee_cannot_view_another_employees_ticket(tokens):
    """Employees receive 403 when trying to view a ticket created by another employee."""
    emp2_headers = {"Authorization": f"Bearer {tokens['emp2']}"}

    # Create a ticket owned by EMP-101
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}
    create_res = client.post(
        "/tickets",
        json={"title": "EMP-101 Secret Ticket", "description": "Private ticket description"},
        headers=emp1_headers
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["ticket_id"]

    # EMP-102 attempts to view EMP-101's ticket
    res = client.get(f"/tickets/{ticket_id}", headers=emp2_headers)
    assert res.status_code == 403
    assert "only authorized to view your own" in res.json()["detail"].lower()


def test_employee_cannot_close_another_employees_ticket(tokens):
    """Employees receive 403 when attempting to close another employee's resolved ticket."""
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}
    emp2_headers = {"Authorization": f"Bearer {tokens['emp2']}"}
    support_headers = {"Authorization": f"Bearer {tokens['support']}"}

    # 1. EMP-101 creates ticket
    create_res = client.post(
        "/tickets",
        json={"title": "EMP-101 Close Test", "description": "Test closing restrictions"},
        headers=emp1_headers
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["ticket_id"]

    # 2. Support resolves ticket
    res_resolve = client.post(
        f"/tickets/{ticket_id}/resolve",
        json={"resolution": "Resolved by support specialist."},
        headers=support_headers
    )
    assert res_resolve.status_code == 200

    # 3. EMP-102 tries to close EMP-101's ticket -> Rejected with 403
    close_attempt = client.post(f"/tickets/{ticket_id}/close", headers=emp2_headers)
    assert close_attempt.status_code == 403
    assert "only authorized to close support tickets created by you" in close_attempt.json()["detail"].lower()

    # 4. EMP-101 closes own ticket -> Succeeds with 200
    valid_close = client.post(f"/tickets/{ticket_id}/close", headers=emp1_headers)
    assert valid_close.status_code == 200
    assert valid_close.json()["status"] == "CLOSED"


def test_cannot_close_unresolved_ticket_as_employee(tokens):
    """Employee cannot close an open or in-progress ticket before it is resolved."""
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}

    create_res = client.post(
        "/tickets",
        json={"title": "Still Open Ticket", "description": "Has not been resolved yet"},
        headers=emp1_headers
    )
    assert create_res.status_code == 201
    ticket_id = create_res.json()["ticket_id"]

    close_res = client.post(f"/tickets/{ticket_id}/close", headers=emp1_headers)
    assert close_res.status_code == 400
    assert "before it is resolved" in close_res.json()["detail"].lower()


def test_cannot_assign_non_support_user(tokens):
    """Assigning a ticket to a standard employee is rejected."""
    support_headers = {"Authorization": f"Bearer {tokens['support']}"}

    create_res = client.post(
        "/tickets",
        json={"title": "Assign Check", "description": "Validating assignment target role"},
        headers=support_headers
    )
    ticket_id = create_res.json()["ticket_id"]

    # Try assigning to EMP-101 (role EMPLOYEE)
    assign_res = client.post(
        f"/tickets/{ticket_id}/assign",
        json={"assigned_to": "EMP-101"},
        headers=support_headers
    )
    assert assign_res.status_code == 400
    assert "only be assigned to support or admin" in assign_res.json()["detail"].lower()
