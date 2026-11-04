"""
Test suite for Self-Service Password Recovery & Reset Workflow:
- POST /auth/forgot-password (by user_id and email)
- GET  /auth/verify-reset-token
- POST /auth/reset-password
- Login verification with updated credentials
- Single-use and expiration enforcement
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database.connection import db_manager
from app.models.db_models import UserDB
from app.services.auth_service import AuthService

client = TestClient(app)


def test_forgot_password_by_user_id_and_email():
    """Verifies that requesting a reset code works with both User ID and Work Email."""
    # 1. By User ID (EMP-101)
    res1 = client.post("/auth/forgot-password", json={"identifier": "EMP-101"})
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["user_id"] == "EMP-101"
    assert "reset_token" in data1
    assert data1["reset_token"].startswith("RST-")
    assert data1["expires_in_minutes"] == 15

    # 2. By Email (a.smith@company.com)
    res2 = client.post("/auth/forgot-password", json={"identifier": "a.smith@company.com"})
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["user_id"] == "EMP-101"
    assert "reset_token" in data2


def test_forgot_password_nonexistent_user_returns_404():
    """Non-existent identifier returns 404 Not Found."""
    res = client.post("/auth/forgot-password", json={"identifier": "NON_EXISTENT_USER_999"})
    assert res.status_code == 404
    assert "No account found" in res.json()["detail"]


def test_verify_reset_token():
    """Verifies reset token validity checks."""
    # Generate token for IT-501
    f_res = client.post("/auth/forgot-password", json={"identifier": "IT-501"})
    assert f_res.status_code == 200
    token = f_res.json()["reset_token"]

    # Valid token
    v_res = client.get(f"/auth/verify-reset-token?token={token}")
    assert v_res.status_code == 200
    v_data = v_res.json()
    assert v_data["valid"] is True
    assert v_data["user_id"] == "IT-501"

    # Invalid token -> 400
    bad_res = client.get("/auth/verify-reset-token?token=RST-INVALIDTOKEN99999999")
    assert bad_res.status_code == 400


def test_complete_password_reset_and_login():
    """Complete end-to-end flow: request reset, update password, and login with new credentials."""
    target_user = "EMP-102"
    new_password = "BrandNewSecurePassword#2026"

    # 1. Request reset
    f_res = client.post("/auth/forgot-password", json={"identifier": target_user})
    assert f_res.status_code == 200
    token = f_res.json()["reset_token"]

    # 2. Short password rejected (Pydantic validation returns 422, or business logic returns 400)
    short_res = client.post("/auth/reset-password", json={"token": token, "new_password": "short"})
    assert short_res.status_code in (400, 422)

    try:
        # 3. Successful password reset
        reset_res = client.post("/auth/reset-password", json={"token": token, "new_password": new_password})
        assert reset_res.status_code == 200
        assert "updated successfully" in reset_res.json()["message"].lower()

        # 4. Single-use check: reused token must fail
        reuse_res = client.post("/auth/reset-password", json={"token": token, "new_password": "AnotherPassword#123"})
        assert reuse_res.status_code == 400

        # 5. Old password fails
        old_login = client.post("/auth/login", json={"user_id": target_user, "password": "password"})
        assert old_login.status_code == 401

        # 6. New password succeeds
        new_login = client.post("/auth/login", json={"user_id": target_user, "password": new_password})
        assert new_login.status_code == 200
        assert new_login.json()["user"]["user_id"] == target_user
    finally:
        # Always restore default password for test consistency across other test files
        r_restore = client.post("/auth/forgot-password", json={"identifier": target_user})
        if r_restore.status_code == 200 and "reset_token" in r_restore.json():
            client.post(
                "/auth/reset-password",
                json={"token": r_restore.json()["reset_token"], "new_password": "password"}
            )
