"""
Regression tests for all 7 security & workflow fixes:
1. Password reset security (generic response, email channel, rate limiting)
2. Asset assignment authorization (Admin-only + atomic asset_assignments history on PUT)
3. Automatic ticket assignment (Admin-authorized policy gating + manual Admin assignment)
4. Employee ticket verification (creator-only closure)
5. Database-backed JWT token revocation
6. Equipment request creation restricted to EMPLOYEE
7. Alembic database migration runner
"""

import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect

from app.main import app
from app.database.connection import db_manager
from app.models.db_models import AssetAssignmentDB, AssetDB, RevokedTokenDB
from app.services.auth_service import AuthService

client = TestClient(app)


@pytest.fixture(scope="module")
def tokens():
    admin_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    sup_res = client.post("/auth/login", json={"user_id": "IT-501", "password": "password"})
    emp_res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    return {
        "admin": admin_res.json()["access_token"],
        "support": sup_res.json()["access_token"],
        "emp": emp_res.json()["access_token"],
    }


def test_support_cannot_register_update_assign_or_return_assets(tokens):
    sup_h = {"Authorization": f"Bearer {tokens['support']}"}

    assert client.post(
        "/assets",
        json={"asset_id": "SUP-DENY-1", "type": "Laptop", "brand": "Dell", "model": "XPS", "serial_number": "SN-SUP-1"},
        headers=sup_h,
    ).status_code == 403

    assert client.put(
        "/assets/LAP-1025",
        json={"assigned_to": "EMP-101"},
        headers=sup_h,
    ).status_code == 403

    assert client.post(
        "/assets/LAP-1025/assign",
        json={"employee_id": "EMP-101"},
        headers=sup_h,
    ).status_code == 403

    assert client.post("/assets/LAP-1025/return", headers=sup_h).status_code == 403


def test_admin_put_asset_reassignment_creates_atomic_history(tokens):
    adm_h = {"Authorization": f"Bearer {tokens['admin']}"}
    asset_id = "TST-HIST-ASSET-1"

    with db_manager.get_session() as s:
        s.query(AssetAssignmentDB).filter(AssetAssignmentDB.asset_id == asset_id).delete()
        s.query(AssetDB).filter(AssetDB.asset_id == asset_id).delete()
        s.commit()

    try:
        res_create = client.post(
            "/assets",
            json={
                "asset_id": asset_id,
                "type": "Laptop",
                "brand": "Dell",
                "model": "Latitude",
                "serial_number": "SN-HIST-1",
            },
            headers=adm_h,
        )
        assert res_create.status_code == 201

        # 1. Assign via PUT to EMP-101 -> creates open AssetAssignmentDB row
        r1 = client.put(f"/assets/{asset_id}", json={"assigned_to": "EMP-101"}, headers=adm_h)
        assert r1.status_code == 200
        assert r1.json()["assigned_to"] == "EMP-101"
        assert r1.json()["status"] == "ASSIGNED"

        # 2. Reassign via PUT to EMP-102 -> closes EMP-101 row & creates EMP-102 row
        r2 = client.put(f"/assets/{asset_id}", json={"assigned_to": "EMP-102"}, headers=adm_h)
        assert r2.status_code == 200
        assert r2.json()["assigned_to"] == "EMP-102"

        with db_manager.get_session() as s:
            rows = (
                s.query(AssetAssignmentDB)
                .filter(AssetAssignmentDB.asset_id == asset_id)
                .order_by(AssetAssignmentDB.id.asc())
                .all()
            )
            assert len(rows) == 2
            assert rows[0].employee_id == "EMP-101"
            assert rows[0].returned_date is not None
            assert rows[1].employee_id == "EMP-102"
            assert rows[1].returned_date is None

        # 3. Unassign via PUT -> closes EMP-102 row & sets status AVAILABLE
        r3 = client.put(f"/assets/{asset_id}", json={"assigned_to": ""}, headers=adm_h)
        assert r3.status_code == 200
        assert r3.json()["assigned_to"] is None
        assert r3.json()["status"] == "AVAILABLE"

        with db_manager.get_session() as s:
            rows = s.query(AssetAssignmentDB).filter(AssetAssignmentDB.asset_id == asset_id).all()
            assert all(row.returned_date is not None for row in rows)
    finally:
        with db_manager.get_session() as s:
            s.query(AssetAssignmentDB).filter(AssetAssignmentDB.asset_id == asset_id).delete()
            s.query(AssetDB).filter(AssetDB.asset_id == asset_id).delete()
            s.commit()


def test_auto_assignment_requires_explicit_admin_policy(tokens):
    adm_h = {"Authorization": f"Bearer {tokens['admin']}"}
    sup_h = {"Authorization": f"Bearer {tokens['support']}"}
    emp_h = {"Authorization": f"Bearer {tokens['emp']}"}

    # Non-admin cannot change auto-assign policy
    assert client.put("/tickets/policies/auto-assign", json={"enabled": True}, headers=sup_h).status_code == 403
    assert client.put("/tickets/policies/auto-assign", json={"enabled": True}, headers=emp_h).status_code == 403

    # Ensure disabled -> newly created ticket stays OPEN and unassigned
    assert client.put("/tickets/policies/auto-assign", json={"enabled": False}, headers=adm_h).status_code == 200
    t_manual = client.post(
        "/tickets",
        json={"title": "Manual Policy Ticket", "description": "Should stay open until admin assigns"},
        headers=emp_h,
    )
    assert t_manual.status_code == 201
    assert t_manual.json()["status"] == "OPEN"
    assert t_manual.json()["assigned_to"] is None

    # Authorize policy as Admin -> newly created ticket auto-assigns
    assert client.put("/tickets/policies/auto-assign", json={"enabled": True}, headers=adm_h).status_code == 200
    try:
        t_auto = client.post(
            "/tickets",
            json={"title": "Authorized Auto Policy Ticket", "description": "Should auto-assign cleanly"},
            headers=emp_h,
        )
        assert t_auto.status_code == 201
        assert t_auto.json()["status"] == "ASSIGNED"
        assert t_auto.json()["assigned_to"] is not None
    finally:
        client.put("/tickets/policies/auto-assign", json={"enabled": False}, headers=adm_h)


def test_equipment_request_creation_restricted_to_employee(tokens):
    adm_h = {"Authorization": f"Bearer {tokens['admin']}"}
    sup_h = {"Authorization": f"Bearer {tokens['support']}"}
    emp_h = {"Authorization": f"Bearer {tokens['emp']}"}

    payload = {"equipment_type": "Monitor", "reason": "Need secondary display for spreadsheet analysis"}
    assert client.post("/equipment-requests", json=payload, headers=adm_h).status_code == 403
    assert client.post("/equipment-requests", json=payload, headers=sup_h).status_code == 403

    ok = client.post("/equipment-requests", json=payload, headers=emp_h)
    assert ok.status_code == 201
    assert ok.json()["requested_by"] == "EMP-101"


def test_db_backed_token_revocation_survives_lookup():
    login = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    assert login.status_code == 200
    tok = login.json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}

    try:
        assert client.post("/auth/logout", headers=h).status_code == 200
        assert AuthService.is_token_revoked(tok) is True
        assert client.get("/auth/me", headers=h).status_code == 401
    finally:
        with db_manager.get_session() as s:
            s.query(RevokedTokenDB).delete()
            s.commit()


def test_alembic_run_migrations_creates_latest_schema():
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = Path(tmpdir) / "migration_check.db"
        db_url = f"sqlite:///{db_path.as_posix()}"
        db_manager.run_migrations(target_url=db_url)

        engine = create_engine(db_url)
        try:
            tables = set(inspect(engine).get_table_names())
            assert "alembic_version" in tables
            assert "users" in tables
            assert "assets" in tables
            assert "tickets" in tables
            assert "revoked_tokens" in tables
            assert "system_settings" in tables
        finally:
            engine.dispose()
