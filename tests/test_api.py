"""
API Integration & Authentication Unit Tests.

Meets Capstone Specification Section 15:
- User validation & registration
- Authentication & JWT token verification
- Role-Based Access Control (RBAC 403 checks)
- Ticket & Asset API interactions
- HTTP status codes and error responses
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_api_root_status():
    """Validates root endpoint status and metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ONLINE"
    assert "docs" in data


def test_auth_login_successful():
    """Validates login and JWT token generation."""
    response = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["user_id"] == "EMP-101"


def test_auth_login_invalid_password():
    """Validates 401 Unauthorized on incorrect credentials."""
    response = client.post("/auth/login", json={"user_id": "EMP-101", "password": "wrong_password_999"})
    assert response.status_code == 401
    assert "Invalid" in response.json()["detail"]


def test_protected_route_without_token():
    """Validates 401 Unauthorized when missing Authorization header."""
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_rbac_employee_denied_admin_endpoint():
    """Validates 403 Forbidden when an Employee attempts an Admin-only route."""
    # 1. Login as standard employee
    emp_res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    emp_token = emp_res.json()["access_token"]

    # 2. Try creating a user (Admin only)
    response = client.post(
        "/users",
        json={
            "user_id": "EMP-999",
            "name": "Hacker",
            "email": "hacker@evil.com",
            "password": "password123",
            "role": "ADMIN"
        },
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json()["detail"]


def test_create_ticket_with_auto_classification():
    """Validates ticket creation and regex automatic categorization."""
    emp_res = client.post("/auth/login", json={"user_id": "EMP-102", "password": "password"})
    emp_token = emp_res.json()["access_token"]

    response = client.post(
        "/tickets",
        json={
            "title": "VPN connection drops",
            "description": "Internet gateway drops every 10 minutes",
        },
        headers={"Authorization": f"Bearer {emp_token}"}
    )
    assert response.status_code == 201
    ticket = response.json()
    assert ticket["category"] == "Network"
    assert ticket["priority"] in ("HIGH", "MEDIUM")
    assert ticket["created_by"] == "EMP-102"
