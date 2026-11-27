"""
Focused end-to-end tests for:
1. Admin-authorized automatic IT Support assignment & fallback when no eligible support exists.
2. RBAC rules around ticket assignment and closure.
3. Employee resolution verification workflow (`Confirm & Close` -> EMPLOYEE_VERIFIED -> CLOSED,
   and `Issue Not Resolved – Reopen` -> IN_PROGRESS) + audit history & activity logs.
"""

from fastapi.testclient import TestClient

from app.main import app
from app.models.db_models import ActivityLogDB, TicketDB, UserDB
from tests.conftest import TestSessionLocal


client = TestClient(app)


def _auth_headers(user_id: str, password: str = "password") -> dict:
    resp = client.post("/auth/login", json={"user_id": user_id, "password": password})
    assert resp.status_code == 200, f"Login failed for {user_id}: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _set_auto_assign(admin_headers: dict, enabled: bool) -> None:
    resp = client.put(
        "/tickets/policies/auto-assign",
        json={"enabled": enabled},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["enabled"] is enabled


def test_auto_assignment_enabled_persists_active_support_and_history():
    admin_headers = _auth_headers("ADM-001")
    emp_headers = _auth_headers("EMP-101")

    try:
        _set_auto_assign(admin_headers, True)

        create_resp = client.post(
            "/tickets",
            json={
                "title": "Auto-assign dock firmware crash on Thunderbolt",
                "description": "Display drops whenever USB-C dock wakes from sleep mode.",
                "category": "HARDWARE",
                "priority": "HIGH",
            },
            headers=emp_headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        created = create_resp.json()
        ticket_id = created["ticket_id"]

        assert created["status"] == "ASSIGNED"
        assert created["assigned_to"] in {"IT-501", "IT-502", "IT-504"}
        assert created["assigned_to"] != "ADM-001"

        # Confirm persistence via GET API and direct SQLAlchemy DB query
        get_resp = client.get(f"/tickets/{ticket_id}", headers=emp_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["assigned_to"] == created["assigned_to"]
        assert get_resp.json()["status"] == "ASSIGNED"

        db = TestSessionLocal()
        try:
            row = db.query(TicketDB).filter(TicketDB.ticket_id == ticket_id).first()
            assert row is not None
            assert row.assigned_to == created["assigned_to"]
            assert row.status == "ASSIGNED"
        finally:
            db.close()

        hist_resp = client.get(f"/tickets/{ticket_id}/history", headers=admin_headers)
        assert hist_resp.status_code == 200
        history = hist_resp.json()
        assert any(
            h["old_status"] == "OPEN"
            and h["new_status"] == "ASSIGNED"
            and h["assignment_method"] == "AUTOMATIC"
            and h["new_assignee"] == created["assigned_to"]
            for h in history
        )
    finally:
        _set_auto_assign(admin_headers, False)


def test_auto_assignment_fallback_when_no_eligible_support_user():
    admin_headers = _auth_headers("ADM-001")
    emp_headers = _auth_headers("EMP-101")

    db = TestSessionLocal()
    previous_statuses = {}
    try:
        support_users = db.query(UserDB).filter(UserDB.role == "SUPPORT").all()
        for user in support_users:
            previous_statuses[user.user_id] = user.status
            user.status = "INACTIVE"
        db.commit()

        _set_auto_assign(admin_headers, True)

        create_resp = client.post(
            "/tickets",
            json={
                "title": "Fallback test when support team is offline",
                "description": "Testing graceful unassigned OPEN fallback with no active IT support.",
                "category": "NETWORK",
                "priority": "MEDIUM",
            },
            headers=emp_headers,
        )
        assert create_resp.status_code == 201, create_resp.text
        created = create_resp.json()
        ticket_id = created["ticket_id"]

        assert created["status"] == "OPEN"
        assert created["assigned_to"] is None

        logs = (
            db.query(ActivityLogDB)
            .filter(ActivityLogDB.details.contains(ticket_id))
            .all()
        )
        assert any(
            log.action in {"TICKET_AUTO_ASSIGN_SKIPPED", "TICKET_AWAITING_MANUAL_ASSIGNMENT", "TICKET_CREATED"}
            for log in logs
        )
    finally:
        for uid, old_status in previous_statuses.items():
            u = db.query(UserDB).filter(UserDB.user_id == uid).first()
            if u:
                u.status = old_status
        db.commit()
        db.close()
        _set_auto_assign(admin_headers, False)


def test_rbac_prevents_unauthorized_manual_assignment():
    admin_headers = _auth_headers("ADM-001")
    emp_headers = _auth_headers("EMP-101")
    sup_headers = _auth_headers("IT-501")

    _set_auto_assign(admin_headers, False)

    create_resp = client.post(
        "/tickets",
        json={
            "title": "RBAC assignment authorization verification",
            "description": "Should stay OPEN until Admin assigns an eligible active specialist.",
            "category": "SOFTWARE",
            "priority": "LOW",
        },
        headers=emp_headers,
    )
    assert create_resp.status_code == 201
    ticket_id = create_resp.json()["ticket_id"]
    assert create_resp.json()["status"] == "OPEN"
    assert create_resp.json()["assigned_to"] is None

    # Employee and Support cannot manually assign tickets
    assert (
        client.post(
            f"/tickets/{ticket_id}/assign",
            json={"assigned_to": "IT-502"},
            headers=emp_headers,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/tickets/{ticket_id}/assign",
            json={"assigned_to": "IT-502"},
            headers=sup_headers,
        ).status_code
        == 403
    )

    # Admin cannot assign a non-SUPPORT user (e.g., ADMIN)
    bad_assign = client.post(
        f"/tickets/{ticket_id}/assign",
        json={"assigned_to": "ADM-001"},
        headers=admin_headers,
    )
    assert bad_assign.status_code == 400

    # Admin can assign an active SUPPORT user
    good_assign = client.post(
        f"/tickets/{ticket_id}/assign",
        json={"assigned_to": "IT-502", "reason": "Manual specialist dispatch"},
        headers=admin_headers,
    )
    assert good_assign.status_code == 200
    assert good_assign.json()["assigned_to"] == "IT-502"
    assert good_assign.json()["status"] == "ASSIGNED"


def test_employee_verification_confirm_and_close_audit_and_rbac():
    admin_headers = _auth_headers("ADM-001")
    emp1_headers = _auth_headers("EMP-101")
    emp2_headers = _auth_headers("EMP-102")
    sup_headers = _auth_headers("IT-501")

    _set_auto_assign(admin_headers, False)

    create_resp = client.post(
        "/tickets",
        json={
            "title": "Email client sync stopped after password update",
            "description": "Outlook prompts repeatedly for credentials after MFA enrollment.",
            "category": "ACCESS",
            "priority": "HIGH",
        },
        headers=emp1_headers,
    )
    assert create_resp.status_code == 201
    ticket_id = create_resp.json()["ticket_id"]

    # Cannot close before RESOLVED
    early_close = client.post(
        f"/tickets/{ticket_id}/close",
        json={"feedback": "Premature closure attempt"},
        headers=emp1_headers,
    )
    assert early_close.status_code == 400

    # Admin assigns to IT-501, IT-501 starts and resolves
    assert (
        client.post(
            f"/tickets/{ticket_id}/assign",
            json={"assigned_to": "IT-501"},
            headers=admin_headers,
        ).status_code
        == 200
    )
    assert (
        client.put(
            f"/tickets/{ticket_id}",
            json={"status": "IN_PROGRESS"},
            headers=sup_headers,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/tickets/{ticket_id}/resolve",
            json={"resolution": "Cleared cached OAuth token and re-bound profile."},
            headers=sup_headers,
        ).status_code
        == 200
    )

    # Support user cannot verify & close ticket
    assert (
        client.post(
            f"/tickets/{ticket_id}/close",
            json={"feedback": "Support should not close"},
            headers=sup_headers,
        ).status_code
        == 403
    )

    # Different employee cannot close or reopen another employee's ticket
    assert (
        client.post(
            f"/tickets/{ticket_id}/close",
            json={"feedback": "Not owner"},
            headers=emp2_headers,
        ).status_code
        == 403
    )
    assert (
        client.post(
            f"/tickets/{ticket_id}/reopen",
            json={"reason": "Non-owner attempting reopen"},
            headers=emp2_headers,
        ).status_code
        == 403
    )

    # Ticket creator confirms resolution & closes ticket
    close_resp = client.post(
        f"/tickets/{ticket_id}/close",
        json={"feedback": "Issue Resolved - sync works smoothly now"},
        headers=emp1_headers,
    )
    assert close_resp.status_code == 200, close_resp.text
    closed = close_resp.json()
    assert closed["status"] == "CLOSED"
    assert closed["closed_date"] is not None

    # Repeated close or reopen once CLOSED must fail cleanly with 400
    assert (
        client.post(f"/tickets/{ticket_id}/close", headers=emp1_headers).status_code
        == 400
    )
    assert (
        client.post(
            f"/tickets/{ticket_id}/reopen",
            json={"reason": "Too late after closure"},
            headers=emp1_headers,
        ).status_code
        == 400
    )

    # Verify explicit EMPLOYEE_VERIFIED -> CLOSED audit records
    hist_resp = client.get(f"/tickets/{ticket_id}/history", headers=admin_headers)
    assert hist_resp.status_code == 200
    history = hist_resp.json()
    assert any(
        h["old_status"] == "RESOLVED"
        and h["new_status"] == "EMPLOYEE_VERIFIED"
        and h["changed_by"] == "EMP-101"
        and "CONFIRMED" in (h["comment"] or "")
        for h in history
    )
    assert any(
        h["old_status"] == "EMPLOYEE_VERIFIED"
        and h["new_status"] == "CLOSED"
        and h["changed_by"] == "EMP-101"
        for h in history
    )

    db = TestSessionLocal()
    try:
        actions = {
            row.action
            for row in db.query(ActivityLogDB)
            .filter(ActivityLogDB.details.contains(ticket_id))
            .all()
        }
        assert "TICKET_EMPLOYEE_VERIFIED" in actions
        assert "TICKET_CLOSED" in actions
    finally:
        db.close()


def test_employee_verification_issue_not_resolved_reopens_with_audit():
    admin_headers = _auth_headers("ADM-001")
    emp_headers = _auth_headers("EMP-101")
    sup_headers = _auth_headers("IT-504")

    _set_auto_assign(admin_headers, False)

    create_resp = client.post(
        "/tickets",
        json={
            "title": "Conference room HDMI matrix flickers",
            "description": "External projector signal drops after 3 minutes.",
            "category": "HARDWARE",
            "priority": "MEDIUM",
        },
        headers=emp_headers,
    )
    assert create_resp.status_code == 201
    ticket_id = create_resp.json()["ticket_id"]

    assert (
        client.post(
            f"/tickets/{ticket_id}/assign",
            json={"assigned_to": "IT-504"},
            headers=admin_headers,
        ).status_code
        == 200
    )
    assert (
        client.put(
            f"/tickets/{ticket_id}",
            json={"status": "IN_PROGRESS"},
            headers=sup_headers,
        ).status_code
        == 200
    )
    assert (
        client.post(
            f"/tickets/{ticket_id}/resolve",
            json={"resolution": "Replaced HDMI patch cable and updated EDID config."},
            headers=sup_headers,
        ).status_code
        == 200
    )

    # Support cannot reopen ticket via employee verification endpoint
    assert (
        client.post(
            f"/tickets/{ticket_id}/reopen",
            json={"reason": "Support user blocked from reopening"},
            headers=sup_headers,
        ).status_code
        == 403
    )

    # Employee reports Issue Not Resolved -> Reopen
    reopen_resp = client.post(
        f"/tickets/{ticket_id}/reopen",
        json={"reason": "Issue still reproduces during 4K presentation."},
        headers=emp_headers,
    )
    assert reopen_resp.status_code == 200, reopen_resp.text
    reopened = reopen_resp.json()
    assert reopened["status"] == "IN_PROGRESS"
    assert reopened["assigned_to"] == "IT-504"

    hist_resp = client.get(f"/tickets/{ticket_id}/history", headers=admin_headers)
    assert hist_resp.status_code == 200
    assert any(
        h["old_status"] == "RESOLVED"
        and h["new_status"] == "IN_PROGRESS"
        and h["assignment_method"] == "PRESERVED"
        and h["changed_by"] == "EMP-101"
        and "REOPENED" in (h["comment"] or "")
        for h in hist_resp.json()
    )
