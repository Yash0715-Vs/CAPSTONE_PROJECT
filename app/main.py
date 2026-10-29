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
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, status
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
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


# Import Centralized WebSocket Notification Manager
from app.services.websocket_manager import ws_manager




# =====================================================================
# Lifespan Context Manager (Startup / Shutdown)
# =====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Validate configuration and ensure database tables
    config.validate_production_configuration()
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

# CORS Middleware (Allows frontend development workflow with restricted origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
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



FRONTEND_DIR = ROOT_DIR / "frontend"

# Mount Frontend static assets (CSS, JS)
if (FRONTEND_DIR / "css").exists():
    app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
if (FRONTEND_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")


# =====================================================================
# Dashboard & Health Check Endpoints
# =====================================================================
@app.get("/", tags=["Dashboard"])
@app.get("/dashboard", tags=["Dashboard"])
def serve_dashboard():
    """Serves the interactive React Single Page Application (SPA)."""
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return {
        "system": "Smart IT Asset & Support Ticket Management System",
        "status": "ONLINE",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Returns system status, active database dialect, and OpenAPI links."""
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
async def websocket_tickets_endpoint(
    websocket: WebSocket,
    token: Optional[str] = None
):
    """
    WebSocket endpoint for real-time ticket notifications.
    Supports token authentication via query parameter (?token=...) or in-band AUTH frame.
    Enforces authorization on ticket subscriptions and restricts event delivery.
    """
    auth_user_id: Optional[str] = None
    auth_role: Optional[str] = None

    if token:
        try:
            from app.services.auth_service import AuthService
            from app.database.repositories import UserRepository
            payload = AuthService.decode_token(token)
            uid = payload.get("sub")
            with db_manager.get_session() as session:
                user = UserRepository.get_by_user_id(session, uid)
                if user and user.status == "ACTIVE":
                    auth_user_id = user.user_id
                    auth_role = user.role
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid authentication token")
            return

    conn = await ws_manager.connect(websocket, user_id=auth_user_id, role=auth_role)

    try:
        await websocket.send_json({
            "event": "CONNECTED",
            "authenticated": conn.is_authenticated,
            "user_id": conn.user_id,
            "role": conn.role,
            "message": "Connected to real-time IT ticket event stream."
        })

        while True:
            raw_data = await websocket.receive_text()
            await ws_manager.handle_client_message(websocket, raw_data, db_manager.get_session)

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server on http://localhost:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

