"""
Test Suite for Asset Registration and Inventory Management.

Verifies:
- Asset creation with required asset_id (201 Created)
- Database persistence and retrieval
- GET /assets inventory listing
- 422 Validation error when asset_id is omitted
- 400 Bad Request when asset_id already exists
- 400 Bad Request when serial_number already exists
- 403 Forbidden when Employee attempts asset registration (Admin/Support only)
- Database cleanup after test run
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.connection import get_db
from app.models.db_models import AssetDB

client = TestClient(app)

TEST_ASSET_ID = "TST-LAP-909"
TEST_SERIAL = "SN-TEST-REG-909"


@pytest.fixture(autouse=True)
def cleanup_test_assets():
    """Ensure any test-created asset is cleaned up before and after each test."""
    def remove_asset():
        session = next(get_db())
        try:
            asset = session.query(AssetDB).filter(
                (AssetDB.asset_id == TEST_ASSET_ID) | (AssetDB.serial_number == TEST_SERIAL)
            ).first()
            if asset:
                session.delete(asset)
                session.commit()
        finally:
            session.close()

    remove_asset()
    yield
    remove_asset()


def test_asset_registration_success_and_db_persistence():
    """Validates successful hardware asset creation with asset_id and DB persistence."""
    # 1. Login as Admin
    login_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register new asset with asset_id
    payload = {
        "asset_id": TEST_ASSET_ID,
        "type": "Laptop",
        "brand": "Lenovo",
        "model": "ThinkPad P16",
        "serial_number": TEST_SERIAL,
        "status": "AVAILABLE"
    }
    create_res = client.post("/assets", json=payload, headers=headers)
    assert create_res.status_code == 201, f"Expected 201, got {create_res.status_code}: {create_res.text}"
    created_data = create_res.json()
    assert created_data["asset_id"] == TEST_ASSET_ID
    assert created_data["brand"] == "Lenovo"
    assert created_data["status"] == "AVAILABLE"

    # 3. Verify asset appears in GET /assets
    list_res = client.get("/assets", headers=headers)
    assert list_res.status_code == 200
    all_assets = list_res.json()
    matched = [a for a in all_assets if a["asset_id"] == TEST_ASSET_ID]
    assert len(matched) == 1
    assert matched[0]["serial_number"] == TEST_SERIAL

    # 4. Verify directly in database session
    session = next(get_db())
    try:
        db_asset = session.query(AssetDB).filter(AssetDB.asset_id == TEST_ASSET_ID).first()
        assert db_asset is not None
        assert db_asset.serial_number == TEST_SERIAL
        assert db_asset.brand == "Lenovo"
        assert db_asset.type == "Laptop"
    finally:
        session.close()


def test_asset_registration_missing_asset_id_returns_422():
    """Validates that omitting asset_id triggers a Pydantic 422 Unprocessable Entity."""
    login_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Payload without asset_id (the previous frontend bug)
    payload_without_id = {
        "type": "Monitor",
        "brand": "Dell",
        "model": "UltraSharp U2723QE",
        "serial_number": "SN-MISSING-ID-99",
        "status": "AVAILABLE"
    }
    res = client.post("/assets", json=payload_without_id, headers=headers)
    assert res.status_code == 422
    err = res.json()
    assert "detail" in err
    # Confirm that 'asset_id' is listed in the missing error locations
    missing_fields = [d.get("loc", [])[-1] for d in err["detail"] if d.get("type") == "missing"]
    assert "asset_id" in missing_fields


def test_asset_registration_duplicate_asset_id_returns_400():
    """Validates that submitting a duplicate asset_id returns HTTP 400 Bad Request."""
    login_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First creation
    payload = {
        "asset_id": TEST_ASSET_ID,
        "type": "Keyboard",
        "brand": "Logitech",
        "model": "MX Keys",
        "serial_number": TEST_SERIAL,
        "status": "AVAILABLE"
    }
    r1 = client.post("/assets", json=payload, headers=headers)
    assert r1.status_code == 201

    # Second creation with same asset_id but different serial
    payload2 = {
        "asset_id": TEST_ASSET_ID,
        "type": "Keyboard",
        "brand": "Logitech",
        "model": "MX Mechanical",
        "serial_number": "SN-DIFFERENT-9999",
        "status": "AVAILABLE"
    }
    r2 = client.post("/assets", json=payload2, headers=headers)
    assert r2.status_code == 400
    assert f"Asset ID '{TEST_ASSET_ID}' already exists" in r2.json()["detail"]


def test_asset_registration_duplicate_serial_returns_400():
    """Validates that duplicate serial_number returns HTTP 400 Bad Request."""
    login_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First creation
    payload = {
        "asset_id": TEST_ASSET_ID,
        "type": "Mouse",
        "brand": "Logitech",
        "model": "MX Master 3S",
        "serial_number": TEST_SERIAL,
        "status": "AVAILABLE"
    }
    r1 = client.post("/assets", json=payload, headers=headers)
    assert r1.status_code == 201

    # Second creation with different asset_id but same serial_number
    payload2 = {
        "asset_id": "TST-MOU-910",
        "type": "Mouse",
        "brand": "Logitech",
        "model": "MX Anywhere",
        "serial_number": TEST_SERIAL,
        "status": "AVAILABLE"
    }
    r2 = client.post("/assets", json=payload2, headers=headers)
    assert r2.status_code == 400
    assert f"Serial number '{TEST_SERIAL}' is already registered" in r2.json()["detail"]


def test_asset_registration_rbac_employee_forbidden():
    """Validates that standard EMPLOYEES cannot create hardware assets (HTTP 403)."""
    # Login as standard employee
    emp_res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    assert emp_res.status_code == 200
    emp_token = emp_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {emp_token}"}

    payload = {
        "asset_id": TEST_ASSET_ID,
        "type": "Laptop",
        "brand": "Dell",
        "model": "Latitude",
        "serial_number": TEST_SERIAL,
        "status": "AVAILABLE"
    }
    res = client.post("/assets", json=payload, headers=headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["detail"]

