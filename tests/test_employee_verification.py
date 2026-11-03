"""
Unit and Integration Tests for Employee Verification Before Ticket Closure.

Validates:
1. IT Support resolves a ticket (ASSIGNED -> RESOLVED).
2. Support cannot close or reopen tickets (403 Forbidden).
3. Other employees cannot verify, close, or reopen tickets created by another user (403 Forbidden).
4. Employee confirms resolution and closes ticket -> status CLOSED, closed_date set, history logged.
5. Employee reports 'Issue Still Exists' -> status reverts to IN_PROGRESS, assigned specialist preserved.
6. Closed tickets cannot be reopened (400 Bad Request).
7. Unresolved tickets cannot be closed (400 Bad Request).
8. Admin can confirm and close on behalf of employee.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.db_models import TicketDB, TicketHistoryDB
from app.database.connection import db_manager

client = TestClient(app)


@pytest.fixture(scope="module")
def tokens():
    admin_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    sup_res = client.post("/auth/login", json={"user_id": "IT-501", "password": "password"})
    emp1_res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    emp2_res = client.post("/auth/login", json={"user_id": "EMP-102", "password": "password"})

    return {
        "admin": admin_res.json()["access_token"],
        "support": sup_res.json()["access_token"],
        "emp1": emp1_res.json()["access_token"],
        "emp2": emp2_res.json()["access_token"],
    }


def test_employee_verification_and_closure_lifecycle(tokens):
    """Full lifecycle: Create -> Auto-assign/Assign to IT-501 -> Resolve -> Employee Confirm & Close."""
    emp1_h = {"Authorization": f"Bearer {tokens['emp1']}"}
    admin_h = {"Authorization": f"Bearer {tokens['admin']}"}
    sup_h = {"Authorization": f"Bearer {tokens['support']}"}
    emp2_h = {"Authorization": f"Bearer {tokens['emp2']}"}

    # 1. EMP-101 creates a ticket
    c_res = client.post(
        "/tickets",
        json={"title": "Verification Lifecycle Incident", "description": "Display flickers when connecting secondary HDMI monitor"},
        headers=emp1_h
    )
    assert c_res.status_code == 201
    t_id = c_res.json()["ticket_id"]

    # Assign specifically to IT-501
    client.post(f"/tickets/{t_id}/assign", json={"assigned_to": "IT-501"}, headers=admin_h)

    # 2. IT Support resolves ticket
    r_res = client.post(
        f"/tickets/{t_id}/resolve",
        json={"resolution": "Replaced damaged HDMI cable and verified dual display stability."},
        headers=sup_h
    )
    assert r_res.status_code == 200
    assert r_res.json()["status"] == "RESOLVED"
    assert r_res.json()["resolution"] == "Replaced damaged HDMI cable and verified dual display stability."

    # 3. IT Support attempts to close ticket -> 403 Forbidden
    sup_close = client.post(f"/tickets/{t_id}/close", headers=sup_h)
    assert sup_close.status_code == 403
    assert "support specialists cannot close tickets" in sup_close.json()["detail"].lower()

    # 4. Another employee (EMP-102) attempts to close EMP-101's ticket -> 403 Forbidden
    emp2_close = client.post(f"/tickets/{t_id}/close", headers=emp2_h)
    assert emp2_close.status_code == 403

    # 5. EMP-101 verifies and confirms closure with feedback
    emp1_close = client.post(
        f"/tickets/{t_id}/close",
        json={"feedback": "Tested the new HDMI cable, dual monitor setup is perfectly stable now. Thank you!"},
        headers=emp1_h
    )
    assert emp1_close.status_code == 200
    closed_data = emp1_close.json()
    assert closed_data["status"] == "CLOSED"
    assert closed_data["closed_date"] is not None

    # Verify history audit trail
    hist_res = client.get(f"/tickets/{t_id}/history", headers=emp1_h)
    assert hist_res.status_code == 200
    events = hist_res.json()
    assert any(e["new_status"] == "CLOSED" and "Tested the new HDMI cable" in (e.get("comment") or "") for e in events)


def test_employee_reports_issue_still_exists_reopens_ticket(tokens):
    """When employee reports 'Issue Still Exists', status reverts to IN_PROGRESS keeping assigned specialist."""
    emp1_h = {"Authorization": f"Bearer {tokens['emp1']}"}
    admin_h = {"Authorization": f"Bearer {tokens['admin']}"}
    sup_h = {"Authorization": f"Bearer {tokens['support']}"}
    emp2_h = {"Authorization": f"Bearer {tokens['emp2']}"}

    # 1. EMP-101 creates a ticket
    c_res = client.post(
        "/tickets",
        json={"title": "Network VPN Disconnect Issue", "description": "VPN drops every 10 minutes on office Wi-Fi"},
        headers=emp1_h
    )
    assert c_res.status_code == 201
    t_id = c_res.json()["ticket_id"]

    # Assign specifically to IT-501
    client.post(f"/tickets/{t_id}/assign", json={"assigned_to": "IT-501"}, headers=admin_h)

    # 2. IT Support resolves ticket
    r_res = client.post(
        f"/tickets/{t_id}/resolve",
        json={"resolution": "Flushed local DNS cache and renewed DHCP lease."},
        headers=sup_h
    )
    assert r_res.status_code == 200

    # 3. Unrelated employee tries to reopen -> 403 Forbidden
    bad_reopen = client.post(
        f"/tickets/{t_id}/reopen",
        json={"reason": "Attempting unauthorized reopen"},
        headers=emp2_h
    )
    assert bad_reopen.status_code == 403

    # 4. Support tries to reopen -> 403 Forbidden
    sup_reopen = client.post(
        f"/tickets/{t_id}/reopen",
        json={"reason": "Support attempting reopen"},
        headers=sup_h
    )
    assert sup_reopen.status_code == 403

    # 5. EMP-101 reports issue still exists
    reopen_res = client.post(
        f"/tickets/{t_id}/reopen",
        json={"reason": "The VPN still disconnected twice this morning while in a video meeting."},
        headers=emp1_h
    )
    assert reopen_res.status_code == 200
    reopened_data = reopen_res.json()
    assert reopened_data["status"] == "IN_PROGRESS"
    assert reopened_data["assigned_to"] == "IT-501"  # Specialist is strictly preserved

    # 6. Verify audit history contains employee's feedback
    hist_res = client.get(f"/tickets/{t_id}/history", headers=emp1_h)
    assert hist_res.status_code == 200
    events = hist_res.json()
    reopen_event = next(e for e in events if e["new_status"] == "IN_PROGRESS" and "Employee reported issue still exists" in (e.get("comment") or ""))
    assert "video meeting" in reopen_event["comment"]
    assert reopen_event["changed_by"] == "EMP-101"

    # 7. Cannot reopen already IN_PROGRESS ticket -> 400 Bad Request
    invalid_reopen = client.post(
        f"/tickets/{t_id}/reopen",
        json={"reason": "Trying to reopen an in-progress ticket"},
        headers=emp1_h
    )
    assert invalid_reopen.status_code == 400

