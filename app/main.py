"""
Main Application Entry Point (FastAPI).

Meets Capstone Specification Section 12, 38, and 41:
- FastAPI framework with automatic Swagger (/docs) and ReDoc (/redoc)
- Pydantic validation and error handlers
- CORS middleware for React frontend integration
- Full router registration: /auth, /users, /assets, /tickets, /reports
- WebSocket endpoint /ws/tickets for real-time live event streaming
"""

import sys
from pathlib import Path
from typing import List
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import config
from app.database.connection import db_manager
from app.api import (
    auth_router,
    users_router,
    assets_router,
    tickets_router,
    reports_router,
)
from app.utils.exceptions import ITAssetBaseException


# =====================================================================
# Real-Time WebSocket Connection Manager (Section 38)
# =====================================================================
class WebSocketNotificationManager:
    """Manages active WebSocket connections for live ticket updates."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcasts live event to all connected dashboards."""
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


ws_manager = WebSocketNotificationManager()


# =====================================================================
# Lifespan Context Manager (Startup / Shutdown)
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created
    print("[STARTUP] Checking database connection and initializing tables...")
    try:
        db_manager.init_tables()
        print("[STARTUP] Database connection verified successfully.")
    except Exception as err:
        print(f"[STARTUP WARNING] Database auto-init error: {err}")
    yield
    # Shutdown
    print("[SHUTDOWN] Closing database engine pools...")
    db_manager.engine.dispose()


# =====================================================================
# FastAPI Application Instance
# =====================================================================
app = FastAPI(
    title="Smart IT Asset & Support Ticket Management API",
    description="Production-grade REST and Real-Time WebSocket backend built with FastAPI, MySQL, and SQLAlchemy.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware (Allows React frontend at localhost:3000 / localhost:5173 to connect)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(assets_router)
app.include_router(tickets_router)
app.include_router(reports_router)


# =====================================================================
# Custom Domain Exception Handler (Section 11)
# =====================================================================
@app.exception_handler(ITAssetBaseException)
async def domain_exception_handler(request: Request, exc: ITAssetBaseException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": exc.__class__.__name__, "message": exc.message}
    )


# =====================================================================
# Root & Health Check Endpoints
# =====================================================================
@app.get("/", tags=["Health"])
def root():
    return {
        "system": "Smart IT Asset & Support Ticket Management System",
        "status": "ONLINE",
        "docs": "/docs",
        "redoc": "/redoc",
        "database": config.DB_TYPE.upper(),
    }


# =====================================================================
# Real-Time WebSocket Route (Section 38)
# =====================================================================
@app.websocket("/ws/tickets")
async def websocket_tickets_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time ticket notifications.
    Frontend connects here to receive instant updates without polling.
    """
    await ws_manager.connect(websocket)
    try:
        await websocket.send_json({
            "event": "CONNECTED",
            "message": "Connected to real-time IT ticket event stream."
        })
        while True:
            data = await websocket.receive_text()
            # Echo heartbeat or client ping
            await websocket.send_json({"event": "PONG", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server on http://localhost:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
