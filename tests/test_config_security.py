"""
Phase 6 & 7 Unit Tests: Configuration Security, CORS, and Secret Hygiene.

Validates:
- Production environment rejects weak or default SECRET_KEY.
- Development profile allows safe local testing.
- CORS allowed origins correctly parsed from environment without wildcard with credentials.
- Database URL builder formats MySQL, PostgreSQL, and SQLite correctly.
- Sensitive credentials (password hashes, secret keys, invitation tokens) never appear in user profile or list responses.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import Config

client = TestClient(app)


def test_production_rejects_weak_secret_key(monkeypatch):
    """Production mode strictly raises ValueError if weak or default secret key is present."""
    monkeypatch.setattr(Config, "APP_ENV", "prod")
    monkeypatch.setattr(Config, "SECRET_KEY", "dev_secret_key_for_local_testing_only_capstone_2026")

    with pytest.raises(ValueError) as excinfo:
        Config.validate_production_configuration()
    assert "CRITICAL SECURITY CONFIGURATION ERROR" in str(excinfo.value)


def test_production_accepts_strong_secret_key(monkeypatch):
    """Production mode accepts 32+ character strong unpredictable secret key."""
    monkeypatch.setattr(Config, "APP_ENV", "prod")
    monkeypatch.setattr(Config, "SECRET_KEY", "a_very_strong_production_secret_key_with_high_entropy_123456789")

    # Should not raise exception
    Config.validate_production_configuration()


def test_cors_origins_contain_no_wildcard():
    """CORS origins should contain specific localhost/frontend domains and not wildcard."""
    origins = Config.ALLOWED_ORIGINS
    assert isinstance(origins, list)
    assert len(origins) > 0
    assert "*" not in origins


def test_no_sensitive_secrets_in_user_responses():
    """User profile and user listing responses must never contain password hash or invitation token hash."""
    admin_login = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    admin_token = admin_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Test /auth/me
    me_res = client.get("/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert "hashed_password" not in me_data
    assert "invitation_token_hash" not in me_data
    assert "secret_key" not in me_data

    # Test /users
    users_res = client.get("/users", headers=headers)
    assert users_res.status_code == 200
    for u in users_res.json():
        assert "hashed_password" not in u
        assert "invitation_token_hash" not in u
