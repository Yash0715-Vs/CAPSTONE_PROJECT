"""
WebSocket Connection & Notification Management Service.

Meets Capstone Specification Section 38:
- Centralized WebSocket connection lifecycle
- Authentication verification (JWT token via query parameter or in-band frame)
- Authorization of ticket-specific subscriptions (preventing data leakage)
- Role-based broadcasting (Admins & Support receive all; Employees receive own tickets only)
- Safe disconnection handling
"""

import asyncio
import json
from typing import Dict, Set, Optional
from fastapi import WebSocket


class AuthenticatedConnection:
    """Holds individual WebSocket connection state and subscription permissions."""
    def __init__(self, websocket: WebSocket, user_id: Optional[str] = None, role: Optional[str] = None):
        self.websocket = websocket
        self.user_id = user_id
        self.role = role
        self.is_authenticated = bool(user_id)
        self.subscribed_tickets: Set[str] = set()


class WebSocketNotificationManager:
    """
    Manages active WebSocket connections for live ticket updates:
    - Verifies authentication credentials (JWT token)
    - Enforces authorization on ticket subscriptions
    - Restricts real-time event broadcasts based on user role and ownership
    - Cleans up dropped or disconnected sockets
    """
    def __init__(self):
        self.connections: Dict[WebSocket, AuthenticatedConnection] = {}

    async def connect(
        self, websocket: WebSocket, user_id: Optional[str] = None, role: Optional[str] = None
    ) -> AuthenticatedConnection:
        await websocket.accept()
        conn = AuthenticatedConnection(websocket, user_id=user_id, role=role)
        self.connections[websocket] = conn
        return conn

    def disconnect(self, websocket: WebSocket):
        if websocket in self.connections:
            del self.connections[websocket]

    def authenticate_connection(self, websocket: WebSocket, user_id: str, role: str):
        if websocket in self.connections:
            conn = self.connections[websocket]
            conn.user_id = user_id
            conn.role = role
            conn.is_authenticated = True

    async def broadcast(self, message: dict):
        """Broadcasts general message to all active sockets."""
        for ws in list(self.connections):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

    async def handle_client_message(
        self, websocket: WebSocket, raw_data: str, session_factory
    ):
        """Parses and dispatches inbound WebSocket frame from a client."""
        conn = self.connections.get(websocket)

        if raw_data.strip().upper() == "PING":
            await websocket.send_json({"event": "PONG", "data": "PING"})
            return

        try:
            msg = json.loads(raw_data)
        except Exception:
            await websocket.send_json({"event": "ERROR", "message": "Invalid JSON format."})
            return

        action = str(msg.get("action", "")).lower()

        if action == "ping":
            await websocket.send_json({"event": "PONG", "data": msg.get("data", "PONG")})
        elif action in ("auth", "authenticate"):
            await self._handle_auth_action(websocket, msg, session_factory)
        elif action == "subscribe":
            await self._handle_subscribe_action(websocket, conn, msg, session_factory)
        elif action == "unsubscribe":
            await self._handle_unsubscribe_action(websocket, conn, msg)
        else:
            await websocket.send_json({"event": "ERROR", "message": f"Unknown action '{action}'."})

    async def _handle_auth_action(self, websocket: WebSocket, msg: dict, session_factory):
        token_val = msg.get("token")
        if not token_val:
            await websocket.send_json({"event": "AUTH_FAILED", "message": "Token parameter required."})
            return

        try:
            from app.services.auth_service import AuthService  # pylint: disable=import-outside-toplevel
            from app.database.repositories import UserRepository  # pylint: disable=import-outside-toplevel
            payload = AuthService.decode_token(token_val)
            uid = payload.get("sub")
            with session_factory() as session:
                user = UserRepository.get_by_user_id(session, uid)
                if not user or user.status != "ACTIVE":
                    await websocket.send_json({"event": "AUTH_FAILED", "message": "User inactive or not found."})
                    return
                self.authenticate_connection(websocket, user.user_id, user.role)
                await websocket.send_json({
                    "event": "AUTH_SUCCESS",
                    "user_id": user.user_id,
                    "role": user.role,
                    "message": f"Successfully authenticated as {user.name}"
                })
        except Exception as err:
            await websocket.send_json({"event": "AUTH_FAILED", "message": f"Authentication error: {err}"})

    async def _handle_subscribe_action(
        self, websocket: WebSocket, conn: Optional[AuthenticatedConnection], msg: dict, session_factory
    ):
        if not conn or not conn.is_authenticated:
            await websocket.send_json({"event": "ERROR", "message": "Authentication required to subscribe to tickets."})
            return

        target_ticket_id = msg.get("ticket_id")
        if not target_ticket_id:
            await websocket.send_json({"event": "ERROR", "message": "ticket_id is required."})
            return

        from app.database.repositories import TicketRepository  # pylint: disable=import-outside-toplevel
        with session_factory() as session:
            ticket = TicketRepository.get_by_ticket_id(session, target_ticket_id)
            if not ticket:
                await websocket.send_json({"event": "ERROR", "message": f"Ticket '{target_ticket_id}' not found."})
                return

            if conn.role == "EMPLOYEE" and ticket.created_by != conn.user_id:
                await websocket.send_json({
                    "event": "FORBIDDEN",
                    "message": f"Access denied: You are not authorized to subscribe to ticket {target_ticket_id}."
                })
                return

            conn.subscribed_tickets.add(target_ticket_id)
            await websocket.send_json({
                "event": "SUBSCRIBED",
                "ticket_id": target_ticket_id,
                "message": f"Subscribed to updates for ticket {target_ticket_id}."
            })

    async def _handle_unsubscribe_action(
        self, websocket: WebSocket, conn: Optional[AuthenticatedConnection], msg: dict
    ):
        target_ticket_id = msg.get("ticket_id")
        if conn and target_ticket_id and target_ticket_id in conn.subscribed_tickets:
            conn.subscribed_tickets.remove(target_ticket_id)
        await websocket.send_json({"event": "UNSUBSCRIBED", "ticket_id": target_ticket_id})

    async def broadcast_ticket_event(self, event_type: str, ticket_data: dict):
        """
        Broadcasts ticket events only to authorized users:
        - ADMIN & SUPPORT: receive all ticket updates across the organization.
        - EMPLOYEE: receives updates only for tickets created by them or explicitly subscribed.
        - Unauthenticated connections never receive ticket data.
        """
        ticket_id = ticket_data.get("ticket_id")
        created_by = ticket_data.get("created_by")

        payload = {
            "event": event_type,
            "ticket": ticket_data,
        }

        for ws, conn in list(self.connections.items()):
            if not conn.is_authenticated:
                continue

            # Role-based filtering
            if conn.role in ("ADMIN", "SUPPORT"):
                should_receive = True
            elif conn.role == "EMPLOYEE":
                should_receive = (created_by == conn.user_id) or (ticket_id in conn.subscribed_tickets)
            else:
                should_receive = False

            if should_receive:
                try:
                    await ws.send_json(payload)
                except Exception:
                    self.disconnect(ws)

    def trigger_ticket_broadcast(self, event_type: str, ticket_data: dict):
        """Helper to safely schedule an async broadcast from synchronous route handlers."""
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast_ticket_event(event_type, ticket_data))
        except RuntimeError:
            # No running loop in synchronous thread
            pass


# Singleton notification manager instance
ws_manager = WebSocketNotificationManager()
