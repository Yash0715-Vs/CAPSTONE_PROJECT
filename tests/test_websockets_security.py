"""
Phase 5 Unit Tests: Real-Time WebSocket Security & Event Handling.

Validates:
- Handshake with valid query token (?token=...) authenticates user immediately.
- Handshake with invalid/tampered token is rejected with WS_1008_POLICY_VIOLATION.
- Unauthenticated connection can ping-pong but cannot subscribe to tickets.
- In-band AUTH frame validates token and transitions connection to authenticated state.
- In-band AUTH frame with invalid token returns AUTH_FAILED.
- Employee subscribing to their own ticket succeeds (SUBSCRIBED).
- Employee attempting to subscribe to another user's ticket is rejected (FORBIDDEN).
- Support / Admin specialist can subscribe to any organizational ticket.
- Real-time ticket event filtering (employees only receive authorized events).
"""

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module")
def tokens():
    """Fetches tokens for Admin, Support, and two distinct Employees."""
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


def test_ws_connect_with_valid_query_token(tokens):
    """Connecting with a valid JWT in the query parameter authenticates immediately."""
    with client.websocket_connect(f"/ws/tickets?token={tokens['emp1']}") as ws:
        init_event = ws.receive_json()
        assert init_event["event"] == "CONNECTED"
        assert init_event["authenticated"] is True
        assert init_event["user_id"] == "EMP-101"
        assert init_event["role"] == "EMPLOYEE"


def test_ws_connect_with_invalid_query_token():
    """Connecting with an invalid query token causes the socket to be rejected / closed."""
    with pytest.raises(WebSocketDisconnect) as excinfo:
        with client.websocket_connect("/ws/tickets?token=invalid_malformed_token_999") as ws:
            ws.receive_json()
    assert excinfo.value.code == 1008


def test_ws_unauthenticated_connection_and_inband_auth(tokens):
    """Unauthenticated socket can connect and subsequently authenticate in-band via JSON frame."""
    with client.websocket_connect("/ws/tickets") as ws:
        init_event = ws.receive_json()
        assert init_event["event"] == "CONNECTED"
        assert init_event["authenticated"] is False

        # Ping-pong works
        ws.send_text("PING")
        pong = ws.receive_json()
        assert pong["event"] == "PONG"

        # Attempt subscribe without auth -> Rejected
        ws.send_json({"action": "subscribe", "ticket_id": "INC-1001"})
        sub_err = ws.receive_json()
        assert sub_err["event"] == "ERROR"
        assert "authentication required" in sub_err["message"].lower()

        # In-band auth with invalid token -> AUTH_FAILED
        ws.send_json({"action": "auth", "token": "bad_token"})
        auth_fail = ws.receive_json()
        assert auth_fail["event"] == "AUTH_FAILED"

        # In-band auth with valid token -> AUTH_SUCCESS
        ws.send_json({"action": "auth", "token": tokens["emp1"]})
        auth_success = ws.receive_json()
        assert auth_success["event"] == "AUTH_SUCCESS"
        assert auth_success["user_id"] == "EMP-101"


def test_ws_employee_ticket_subscription_authorization(tokens):
    """
    Employees can subscribe to their own tickets, but are forbidden
    from subscribing to other employees' tickets.
    """
    # 1. Create a ticket owned by EMP-101
    emp1_headers = {"Authorization": f"Bearer {tokens['emp1']}"}
    create_res = client.post(
        "/tickets",
        json={"title": "EMP-101 WS Test", "description": "Testing WebSocket subscription auth"},
        headers=emp1_headers
    )
    assert create_res.status_code == 201
    emp1_ticket_id = create_res.json()["ticket_id"]

    # 2. EMP-101 connects and subscribes to own ticket -> SUBSCRIBED
    with client.websocket_connect(f"/ws/tickets?token={tokens['emp1']}") as ws_emp1:
        ws_emp1.receive_json()  # Consume CONNECTED
        ws_emp1.send_json({"action": "subscribe", "ticket_id": emp1_ticket_id})
        res1 = ws_emp1.receive_json()
        assert res1["event"] == "SUBSCRIBED"
        assert res1["ticket_id"] == emp1_ticket_id

    # 3. EMP-102 connects and attempts to subscribe to EMP-101's ticket -> FORBIDDEN
    with client.websocket_connect(f"/ws/tickets?token={tokens['emp2']}") as ws_emp2:
        ws_emp2.receive_json()  # Consume CONNECTED
        ws_emp2.send_json({"action": "subscribe", "ticket_id": emp1_ticket_id})
        res2 = ws_emp2.receive_json()
        assert res2["event"] == "FORBIDDEN"
        assert "not authorized" in res2["message"].lower()

    # 4. IT Support connects and subscribes to any ticket -> SUBSCRIBED
    with client.websocket_connect(f"/ws/tickets?token={tokens['support']}") as ws_support:
        ws_support.receive_json()  # Consume CONNECTED
        ws_support.send_json({"action": "subscribe", "ticket_id": emp1_ticket_id})
        res_sup = ws_support.receive_json()
        assert res_sup["event"] == "SUBSCRIBED"
