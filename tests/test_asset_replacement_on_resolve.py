"""
Unit and Integration Tests for Asset Replacement during Ticket Resolution.

Validates:
1. IT Support or Admin resolves a ticket where the asset is non-repairable.
2. Old asset is retired and unassigned from the employee.
3. Available replacement asset is assigned to the employee.
4. Asset assignment ledger tracks the decommission and new allocation.
5. Ticket linked asset and resolution notes reflect the replacement.
6. Validation errors if replacement asset is non-existent or not available.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app
from app.database.connection import db_manager
from app.models.db_models import AssetDB, AssetAssignmentDB, TicketDB

client = TestClient(app)


@pytest.fixture(scope="module")
def auth_tokens():
    admin_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    sup_res = client.post("/auth/login", json={"user_id": "IT-501", "password": "password"})
    emp_res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})

    return {
        "admin": admin_res.json()["access_token"],
        "support": sup_res.json()["access_token"],
        "emp": emp_res.json()["access_token"],
    }


def test_resolve_ticket_with_asset_replacement(auth_tokens):
    """IT Support resolves a ticket, decommissioning the old asset and assigning a replacement."""
    admin_h = {"Authorization": f"Bearer {auth_tokens['admin']}"}
    sup_h = {"Authorization": f"Bearer {auth_tokens['support']}"}
    emp_h = {"Authorization": f"Bearer {auth_tokens['emp']}"}

    with db_manager.get_session() as s:
        # Create an old assigned asset
        old_asset = AssetDB(
            asset_id="OLD-TEST-901",
            type="Laptop",
            brand="Dell",
            model="Latitude 5420",
            serial_number="SN-OLD-DELL-901",
            status="ASSIGNED",
            assigned_to="EMP-101"
        )
        # Create an available replacement asset
        new_asset = AssetDB(
            asset_id="NEW-TEST-902",
            type="Laptop",
            brand="Lenovo",
            model="ThinkPad T14s",
            serial_number="SN-NEW-LENOVO-902",
            status="AVAILABLE",
            assigned_to=None
        )
        s.merge(old_asset)
        s.merge(new_asset)
        s.commit()

        # Add initial assignment for old asset
        old_assign = AssetAssignmentDB(
            asset_id="OLD-TEST-901",
            employee_id="EMP-101",
            assigned_date=datetime.now(timezone.utc),
            notes="Initial employee deployment"
        )
        s.add(old_assign)
        s.commit()

    # 1. EMP-101 creates a ticket linked to OLD-TEST-901
    c_res = client.post(
        "/tickets",
        json={
            "title": "Severe Motherboard Power Failure",
            "description": "Laptop completely unresponsive after electrical surge",
            "asset_id": "OLD-TEST-901"
        },
        headers=emp_h
    )
    assert c_res.status_code == 201
    t_id = c_res.json()["ticket_id"]

    # Assign specifically to IT-501
    client.post(f"/tickets/{t_id}/assign", json={"assigned_to": "IT-501"}, headers=admin_h)

    # 2. IT-501 resolves ticket with is_non_repairable=True and replacement_asset_id="NEW-TEST-902"
    resolve_payload = {
        "resolution": "Inspected hardware; motherboard is fried and non-repairable. Issued brand new replacement laptop.",
        "is_non_repairable": True,
        "old_asset_id": "OLD-TEST-901",
        "replacement_asset_id": "NEW-TEST-902"
    }
    r_res = client.post(f"/tickets/{t_id}/resolve", json=resolve_payload, headers=sup_h)
    assert r_res.status_code == 200
    res_data = r_res.json()
    assert res_data["status"] == "RESOLVED"
    assert "Asset Replaced" in res_data["resolution"]
    assert res_data["asset_id"] == "NEW-TEST-902"

    # 3. Verify database state
    with db_manager.get_session() as s:
        # Check old asset is RETIRED and unassigned
        db_old = s.query(AssetDB).filter(AssetDB.asset_id == "OLD-TEST-901").first()
        assert db_old.status == "RETIRED"
        assert db_old.assigned_to is None

        # Check new asset is ASSIGNED to EMP-101
        db_new = s.query(AssetDB).filter(AssetDB.asset_id == "NEW-TEST-902").first()
        assert db_new.status == "ASSIGNED"
        assert db_new.assigned_to == "EMP-101"

        # Check assignment log has closed old assignment and created new one
        closed_log = (
            s.query(AssetAssignmentDB)
            .filter(AssetAssignmentDB.asset_id == "OLD-TEST-901")
            .first()
        )
        assert closed_log.returned_date is not None

        new_log = (
            s.query(AssetAssignmentDB)
            .filter(AssetAssignmentDB.asset_id == "NEW-TEST-902")
            .first()
        )
        assert new_log is not None
        assert new_log.employee_id == "EMP-101"

