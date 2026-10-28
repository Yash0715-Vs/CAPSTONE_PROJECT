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


def test_api_root_serves_dashboard():
    """Validates that root endpoint serves the frontend dashboard HTML."""
    response = client.get("/")
    assert response.status_code == 200
    assert "<!DOCTYPE html>" in response.text
    assert "Smart IT Asset" in response.text


def test_api_health_status():
    """Validates health check endpoint returns ONLINE status."""
    response = client.get("/health")
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


def test_external_api_integration():
    """Validates external HTTP API integration via requests (Section 14)."""
    admin_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    admin_token = admin_res.json()["access_token"]

    response = client.get(
        "/reports/external-status",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("SUCCESS", "ERROR")


def test_websocket_ticket_stream():
    """Validates real-time WebSocket connection and event handling (Section 38)."""
    with client.websocket_connect("/ws/tickets") as websocket:
        init_event = websocket.receive_json()
        assert init_event["event"] == "CONNECTED"
        assert "real-time" in init_event["message"].lower()

        # Send heartbeat ping
        websocket.send_text("PING")
        reply = websocket.receive_json()
        assert reply["event"] == "PONG"
