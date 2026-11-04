# Smart IT Asset & Support Ticket Management System

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-red.svg)](https://www.sqlalchemy.org/)
[![Pylint](https://img.shields.io/badge/Pylint-10.00%2F10-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Pytest-86%20Passed-success.svg)]()
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)

An enterprise-grade, production-style **IT Asset Management and Support Ticket Management System** developed with **Python, FastAPI, SQLAlchemy 2, Alembic, MySQL 8.0 (Primary) / PostgreSQL 15, WebSockets, and a React 18 Single Page Application (SPA)**.

---

## 📌 Table of Contents
1. [Project Overview](#-project-overview)
2. [Technology Stack](#-technology-stack)
3. [System Architecture](#-system-architecture)
4. [Database Design & ER Diagram](#-database-design--er-diagram)
5. [Database Dialects & Environment Profiles](#-database-dialects--environment-profiles)
6. [Core Features & Modules](#-core-features--modules)
7. [Advanced Python Concepts Demonstrated](#-advanced-python-concepts-demonstrated)
8. [Docker & Containerization](#-docker--containerization)
9. [Local Setup & Run Instructions](#-local-setup--run-instructions)
10. [Automated Testing & Code Quality](#-automated-testing--code-quality)
11. [API Endpoints Reference](#-api-endpoints-reference)
12. [Comprehensive College Viva Guide](#-comprehensive-college-viva-guide)

---

## 📚 Documentation Guide

To navigate the project documentation effectively:
* **[`README.md`](README.md) (This Document)**: Authoritative single source of truth for the implemented system, architectural diagrams, MySQL/PostgreSQL configuration, security controls, API specifications, and test results.
* **[`Prerequisites.md`](Prerequisites.md)**: Technical checklist and foundational concepts (Python OOP, FastAPI, SQLAlchemy, Docker, JWT) recommended prior to code review.
* **[`Capstone_1_IT_Asset_Ticket_Management_README.md`](Capstone_1_IT_Asset_Ticket_Management_README.md)**: The original capstone requirements specification, core milestones, and evaluation guidelines.

---

## 📖 Project Overview

Organizations require seamless management of physical hardware assets (laptops, monitors, keyboards, mice, printers) and structured support ticket workflows for employee issue resolution. 

This system provides:
- **Role-Based Access Control (RBAC)** across three distinct personas: **Admin**, **IT Support**, and **Employee**.
- **Hardware Asset Lifecycle Tracking**: `AVAILABLE` → `ASSIGNED` → `UNDER_REPAIR` → `RETIRED` with hardware specifications and serial number encapsulation.
- **Automated Ticket Classification**: Regex-based auto-categorization into `Hardware`, `Software`, `Network`, `Access`, or `Other`, with dynamic priority assignment (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- **SLA Tracking Engine**: Strict resolution turnaround deadlines (**CRITICAL: 2h**, **HIGH: 4h**, **MEDIUM: 8h**, **LOW: 24h**) with real-time breach detection and SLA timers.
- **Real-Time Live Updates via WebSockets**: Instant dashboard notification broadcasts when tickets are opened, assigned, or resolved.
- **Production Readiness**: Alembic migrations, multi-profile configurations (`.env.dev`, `.env.qa`, `.env.prod`), Docker Compose orchestration, and Pylint 10.00/10 code quality.

---

## 🛠 Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Backend Framework** | Python 3.11 / 3.12, FastAPI, Uvicorn, Starlette |
| **Validation & Schemas**| Pydantic v2, Pydantic Settings, Email-Validator |
| **ORM & Database** | SQLAlchemy 2.0 (Repository & Singleton Pattern), Alembic (Migrations) |
| **Database Engines** | **MySQL 8.0** (Primary RDBMS via PyMySQL), PostgreSQL 15 (Tested in QA), SQLite 3 (Unit tests) |
| **Authentication** | OAuth2 Bearer, PyJWT (HMAC-SHA256), Native Bcrypt (Constant-time hashing & salting) |
| **Real-Time & Networking** | FastAPI WebSockets, Python `requests` (External API integration) |
| **Frontend** | React 18, Babel Standalone (Zero Node/NPM dependencies required), Modern Deep Teal CSS |
| **Containerization** | Docker, Docker Compose, Nginx Alpine Reverse Proxy |
| **Testing & Quality** | Pytest (**84 Passed**), Pytest-Asyncio, Pylint (Score: 10.00/10), SonarLint |

---

## 🏗 System Architecture

The application implements a strict **Layered MVC / Clean Architecture**:

```mermaid
graph TD
    User([Browser Client / React Dashboard]) -->|HTTP REST & WebSocket| Gateway[Nginx Reverse Proxy :3000 / FastAPI :8000]
    
    subgraph FastAPI Application Layer
        Gateway --> Router[API Routers: /auth, /users, /assets, /tickets, /reports, /ws]
        Router --> AuthMiddleware[RBAC & JWT Security Dependencies]
        AuthMiddleware --> ServiceLayer[Business Services Layer]
        
        subgraph Services
            ServiceLayer --> SLAEngine[SLA Service Engine]
            ServiceLayer --> TicketClassifier[Regex Ticket Classifier]
            ServiceLayer --> AuthService[Auth & Token Service]
            ServiceLayer --> FileHandler[File I/O & Generator Service]
            ServiceLayer --> ExtAPI[External API Integration Service]
        end
        
        ServiceLayer --> RepoLayer[Repository / Data Access Layer]
        
        subgraph Repositories
            RepoLayer --> UserRepo[UserRepository]
            RepoLayer --> AssetRepo[AssetRepository]
            RepoLayer --> TicketRepo[TicketRepository]
            RepoLayer --> LogRepo[ActivityLogRepository]
        end
    end
    
    RepoLayer --> SingletonDB[Database Connection Manager: Singleton]
    SingletonDB --> RDBMS[(Relational Database: MySQL 8 / PostgreSQL 15)]
```

---

## 🗄 Database Design & ER Diagram

The database enforces strict **ACID** properties with foreign key constraints, primary keys, and unique indexes across **8 relational entities**:

```mermaid
erDiagram
    USERS ||--o{ ASSET_ASSIGNMENTS : receives
    USERS ||--o{ TICKETS : creates
    USERS ||--o{ TICKETS : assigned_to
    USERS ||--o{ TICKET_HISTORY : modifies
    USERS ||--o{ ACTIVITY_LOGS : triggers
    USERS ||--o{ EQUIPMENT_REQUESTS : requests
    USERS ||--o{ EQUIPMENT_REQUESTS : approves
    ASSETS ||--o{ ASSET_ASSIGNMENTS : assigned_in
    ASSETS ||--o{ TICKETS : referenced_in
    ASSETS ||--o{ EQUIPMENT_REQUESTS : fulfills
    TICKETS ||--o{ TICKET_HISTORY : contains
    EQUIPMENT_REQUESTS ||--o{ EQUIPMENT_REQUEST_HISTORY : tracks

    USERS {
        int id PK
        string user_id UK "EMP-101, ADM-001, IT-501"
        string name
        string email UK
        string hashed_password
        string role "ADMIN, SUPPORT, EMPLOYEE"
        string status "ACTIVE, PENDING, DISABLED"
        string invitation_token_hash "SHA-256 single-use token"
        datetime invitation_expires_at
        string department
        datetime created_at
    }

    ASSETS {
        int id PK
        string asset_id UK "LAP-1021, MON-2030"
        string type "Laptop, Monitor, Keyboard, Mouse, Printer"
        string brand
        string model
        string serial_number UK
        date purchase_date
        string status "AVAILABLE, ASSIGNED, UNDER_REPAIR, RETIRED"
        string assigned_to FK "Optional User ID"
        text specs_json "Hardware specifications"
        datetime created_at
    }

    ASSET_ASSIGNMENTS {
        int id PK
        string asset_id FK
        string employee_id FK
        datetime assigned_date
        datetime returned_date
        string notes
    }

    TICKETS {
        int id PK
        string ticket_id UK "INC-1001"
        string title
        text description
        string category "Hardware, Software, Network, Access, Other"
        string priority "LOW, MEDIUM, HIGH, CRITICAL"
        string status "OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED"
        string created_by FK "Employee User ID"
        string assigned_to FK "Support Engineer User ID"
        string asset_id FK "Optional linked asset"
        text resolution "Diagnostic and resolution remarks"
        datetime created_date
        datetime closed_date
    }

    TICKET_HISTORY {
        int id PK
        string ticket_id FK
        string changed_by FK
        string old_status
        string new_status
        string previous_assignee
        string new_assignee
        string assignment_method "AUTOMATIC, MANUAL, REASSIGNED"
        text comment
        datetime timestamp
    }

    ACTIVITY_LOGS {
        int id PK
        string action
        string user_id FK
        text details
        datetime timestamp
    }

    EQUIPMENT_REQUESTS {
        int id PK
        string request_id UK "REQ-2001"
        string requested_by FK "Employee User ID"
        string equipment_type "Laptop, Monitor, Keyboard, Mouse, Printer"
        text reason
        string status "PENDING, APPROVED, REJECTED, PROVISIONED, COMPLETED"
        string approved_by FK "Admin User ID"
        string provisioned_asset_id FK "Assigned inventory asset"
        text admin_notes
        text employee_notes
        datetime created_at
        datetime updated_at
    }

    EQUIPMENT_REQUEST_HISTORY {
        int id PK
        string request_id FK
        string actor FK "User ID who performed action"
        string action "REQUESTED, APPROVED, REJECTED, PROVISIONED, VERIFIED"
        string old_status
        string new_status
        string asset_id FK "Optional asset ID"
        text notes
        datetime timestamp
    }
```

---

## ⚙️ Database Dialects & Environment Profiles

The project defines **MySQL 8.0** as its **primary relational database engine** for both local development and containerized production deployments. The connection manager [pp/database/connection.py](app/database/connection.py) adheres to the **Singleton Pattern** with pluggable multi-dialect support:

1. **Primary Production & Dev Database — MySQL 8.0 (.env / docker-compose.yml)**: Default database running on port 3306 with utf8mb4 character encoding and persistent storage. Fully managed with Alembic schema migrations and accessible via DBeaver or MySQL Workbench.
2. **QA / Staging Profile (.env.qa)**: Configured for **PostgreSQL 15** (via psycopg2-binary) to verify multi-dialect portability.
3. **Automated Test Isolation**: Configured for **SQLite 3** (	est_it_asset.db) for isolated in-memory/file-based unit and regression testing.

> **Architecture Note**: SQLAlchemy 2.0 ORM completely decouples business logic from SQL dialect specifics. By configuring DB_TYPE=mysql (default) or DB_TYPE=postgres in environment variables, the system automatically adapts connection pooling and query dialect execution without modifying backend application code.

### Running Database Migrations (Alembic)
```powershell
# View current database revision
alembic current

# Run forward migrations to latest schema
alembic upgrade head

# Generate a new migration revision
alembic revision --autogenerate -m "Add new column"
```

---

## 🔑 Core Features & Modules

### 1. Role-Based Access Control (RBAC)
- **Admin**: Full authority to create users, register hardware assets, reassign tickets, adjust SLA priorities, and view enterprise audit reports.
- **IT Support**: View tickets assigned to IT queues, update ticket status (`IN_PROGRESS`, `RESOLVED`), append resolution remarks, and monitor approaching SLA breaches.
- **Employee**: Authenticate, view personal profile and assigned company assets, raise new tickets with automated classification, and track resolution progress.

### 2. Automatic Ticket Classification Engine
Located in [`app/services/ticket_classifier.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/services/ticket_classifier.py):
- Uses compiled **regular expressions** and keyword scoring dictionaries.
- Detects category (`Hardware`, `Software`, `Network`, `Access`, `Other`) from ticket title and description.
- Automatically flags emergency keywords (`down`, `crash`, `fire`, `urgent`, `bsod`, `ransomware`) to escalate ticket priority to `CRITICAL` or `HIGH`.

### 3. SLA Calculation & Breach Engine
Located in [`app/services/sla_service.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/services/sla_service.py):
- Computes resolution deadlines strictly based on priority:
  - **CRITICAL**: **2 hours**
  - **HIGH**: **4 hours**
  - **MEDIUM**: **8 hours**
  - **LOW**: **24 hours**
- Tracks live status: `WITHIN_SLA`, `APPROACHING_BREACH` (<20% remaining), or `BREACHED`.
- Generates SLA compliance metrics (% in-SLA, average resolution turnaround minutes).

### 4. Real-Time WebSockets
Located in [`app/main.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/main.py):
- Dedicated route `/ws/tickets` using the `WebSocketNotificationManager`.
- Whenever an asset is reassigned or a ticket is created/resolved, live JSON payloads are broadcast to connected client dashboards without HTTP polling.

### 5. External API Integration
Located in [`app/api/reports.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/api/reports.py):
- Uses Python `requests` with explicit connection and read timeouts (5s).
- Implements robust exception handling for `requests.exceptions.Timeout`, `ConnectionError`, and non-200 HTTP responses with reliable fallback telemetry.


### 6. Employee Resolution Verification & Closure Workflow
Implemented in [`app/api/tickets.py`](app/api/tickets.py):
- **Two-Step Closure Protocol**: IT Support investigates and resolves issues, providing a mandatory resolution summary and setting status to `RESOLVED`.
- **Employee Authority**: Only the employee who originally created the ticket can verify resolution and close it. Support engineers cannot directly close tickets.
- **Two Verification Paths**:
  - **Issue Fixed — Close Ticket**: Confirms the fix, marks status as `CLOSED`, records the verifying employee and server-side timestamp, and writes an audit record in `TicketHistoryDB`.
  - **Issue Still Exists**: Reopens the ticket back to `IN_PROGRESS`, records employee feedback, and keeps the ticket assigned to the current IT engineer for immediate re-investigation.

### 7. Non-Repairable Asset Replacement & Inventory Swap
Implemented in [`app/api/tickets.py`](app/api/tickets.py):
- **Hardware Swap in Resolve Modal**: Support/admin can flag an asset as non-repairable during ticket resolution.
- **Auto-Assign Engine**: Automatically detects the damaged asset category (e.g. `Laptop`) and auto-selects the first available matching asset from inventory.
- **Type-Filtered Manual Picker**: Alternatively, specialists can manually select from a dropdown strictly filtered to matching device types (e.g., only laptops shown for a damaged laptop).
- **Atomic ACID Custody Transfer**: In a single database transaction, the damaged asset is decommissioned (`RETIRED`), old assignment closed, new asset assigned (`ASSIGNED`) to the employee, and ticket updated with complete activity logging.

### 8. Hardware Provisioning & Equipment Requests
Implemented in [`app/api/equipment_requests.py`](app/api/equipment_requests.py):
- **Employee Self-Service**: Employees submit hardware requests with business justification.
- **Admin Review & Provisioning**: Admins review pending requests, approve/reject them, and allocate inventory devices.
- **Audit Ledger**: Every request lifecycle event is recorded in `EquipmentRequestHistoryDB`.

### 9. Modern Deep Teal Responsive UI
- **Horizontal Side-Scroll (`.table-responsive`)**: All 6 enterprise data tables are wrapped in responsive containers with enforced minimum width (`min-width: 980px`), ensuring columns and action buttons never clip on window resize or split-screen.
- **Expandable Descriptions**: Inline `More ⌄` / `Show less ⌃` toggle clamps lengthy incident descriptions to ~80 characters, maintaining uniform, professional table rows.

---

## 🐍 Advanced Python Concepts Demonstrated

The codebase was crafted specifically to satisfy all advanced Python internship requirements:

1. **Object-Oriented Programming & Hierarchy** ([`app/models/asset.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/models/asset.py)):
   - Base `Asset` class with polymorphic subclasses: `Laptop`, `Monitor`, `Keyboard`, `Mouse`, `Printer`.
   - **Encapsulation**: `@property` getter/setter for serial numbers with format validation.
   - **Composition**: `HardwareSpecs` dataclass (`ram_gb`, `processor`, `storage_gb`) composed within `Laptop`.
2. **Generators & Memory Efficiency** ([`app/utils/generators.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/utils/generators.py)):
   - `yield` generator streams to process 10,000+ ticket records in chunked batches without exhausting server RAM.
3. **Custom Decorators** ([`app/utils/decorators.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/utils/decorators.py)):
   - `@log_execution_time`: Benchmarks millisecond runtime latency of sensitive algorithms.
   - `@require_roles_decorator`: Server-side authorization barrier.
4. **Custom Domain Exceptions** ([`app/utils/exceptions.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/utils/exceptions.py)):
   - `InvalidAssetError`, `InvalidStatusTransitionError`, `TicketNotFoundError`, `SLABreachError`, `DatabaseConnectionError`.
   - Handled globally by FastAPI with uniform JSON error structures.
5. **SOLID Principles**:
   - **S**: Single Responsibility per module (API routes handle requests; Services handle business logic; Repositories handle database persistence).
   - **O**: Open/Closed principle in `Asset` hierarchy (new asset types inherit base behavior without modifying existing classes).
   - **L**: Liskov Substitution (subclasses can replace parent `Asset` everywhere).
   - **I**: Interface Segregation (clean Pydantic request vs response schemas).
   - **D**: Dependency Inversion (FastAPI `Depends` injections for sessions and users).

---

## 🐳 Docker & Containerization

The project includes multi-service orchestration via [`docker-compose.yml`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/docker-compose.yml):

```
┌─────────────────────────────────────────────────────────────┐
│                      Docker Network                         │
│                                                             │
│  [Frontend Nginx :3000] ──> [FastAPI Backend :8000] ──> [DB: MySQL 8 :3306]
│  (Static React SPA)         (Uvicorn REST & WS)         (Persistent Volume)
└─────────────────────────────────────────────────────────────┘
```

### Running with Docker Compose:
```bash
# Build and launch all three containers in background
docker-compose up -d --build

# View real-time container logs
docker-compose logs -f backend

# Stop all containers safely
docker-compose down
```

---

## 🚀 Local Setup & Run Instructions

### 1. Prerequisites
- Python 3.11 or 3.12
- MySQL 8.0 running locally (or SQLite fallback)

### 2. Environment Configuration
Copy `.env.example` to create your local `.env`:
```powershell
cp .env.example .env
```
Ensure you provide a strong `SECRET_KEY` (minimum 32 characters in production; `JWT_SECRET_KEY` is also supported) and configure your database credentials.

### 3. Activate Virtual Environment & Install Dependencies
```powershell
# In project root
.\.venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```

### 4. Database Schema Migrations (Alembic)
Run Alembic migrations to apply all schema updates (including user status, invitation tokens, and foreign keys):
```powershell
alembic upgrade head
```

### 5. Secure Admin Account Bootstrap
To create an initial Administrator account safely with cryptographically hashed passwords and audit logging:
```powershell
python scripts/bootstrap_admin.py --user-id ADM-999 --name "System Administrator" --email admin@enterprise.local --department "IT Operations"
```
*(You will be prompted for an admin password securely without echo).*

### 6. Launch the Backend Server
```powershell
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 7. Access the Application
- **Interactive Web Dashboard**: [http://127.0.0.1:8000/](http://127.0.0.1:8000/)
- **Swagger Interactive API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc API Documentation**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- **Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)

### 8. Employee Registration Workflow
1. **Admin Invites Employee** (`POST /users/`):
   - Admin provides `user_id`, `name`, `email`, `department`, `role` (`EMPLOYEE` or `SUPPORT`).
   - Account is created in `PENDING` status with an unguessable, cryptographically secure invitation token valid for 48 hours (stored as a SHA-256 hash).
   - In development, the single-use invitation token is returned in the response for delivery (`invitation_token`).
2. **Employee Verifies Invitation** (`GET /auth/verify-invitation?token=<TOKEN>`):
   - Validates the token exists, is not expired, and account is `PENDING`. Returns employee ID and name.
3. **Employee Completes Registration** (`POST /auth/complete-registration`):
   - Employee submits `token`, `name`, `password` (minimum 8 characters).
   - Password is salted and hashed with bcrypt; `status` transitions to `ACTIVE`; token hash is cleared (single-use).
4. **Employee Logs In** (`POST /auth/login`):
   - Returns Bearer JWT with claims (`sub`, `role`, `status`).

---

## 🧪 Automated Testing & Code Quality

### 1. Running Pytest Suite
```powershell
pytest tests/ -v
```
**Results**: **84 passed** (100% pass rate across all suites), covering:
- **Assignment Service Workflows & Tie-Breaking** (`test_assignment_bugfixes.py`): Assignment tie-breaker using actual `TicketHistoryDB` timestamp, initial status transition recording (`OPEN -> ASSIGNED`).
- **Employee Verification & Closure Lifecycle** (`test_employee_verification.py`): Resolution summary enforcement, employee confirmation & closure, reopening to IN_PROGRESS upon rejection, RBAC closure permission enforcement.
- **Hardware Replacement on Resolve** (`test_asset_replacement_on_resolve.py`): Non-repairable asset decommissioning (RETIRED), automated replacement inventory allocation (ASSIGNED), custody transfer audit logging.
- **Authentication & Registration** (`test_auth_registration.py`): Login success/rejection, elimination of placeholder password bypass, pending/disabled account rejection, single-use invitation lifecycle, invitation expiry.
- **RBAC & Resource Security** (`test_rbac_and_resources.py`): Unauthorized endpoint rejection, IDOR prevention on assets and tickets, support-only assignments, ticket closure rules.
- **WebSocket Security** (`test_websockets_security.py`): Token query authentication, in-band JSON authentication frame, ticket subscription authorization, event broadcast segregation.
- **Configuration & Security** (`test_config_security.py`): Production weak-secret rejection, CORS wildcard prevention, secret omission in API responses.
- **Core Domain Logic** (`test_api.py`, `test_assets.py`, `test_tickets.py`, `test_sla.py`, `test_file_handler.py`).

### 2. Code Quality (Pylint)
```powershell
pylint app/
```
**Rating**: **10.00 / 10** (Zero warnings, zero errors across all modules).

### 3. Static Code Analysis (SonarLint)
To run SonarLint in VS Code:
1. Install the official **SonarLint** extension (`SonarSource.sonarlint-vscode`).
2. Open any `.py` file; SonarLint automatically verifies clean code and zero security hotspots.

---

## 📡 API Endpoints Reference

### Authentication & Account Lifecycle (`/auth`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Authenticates credentials, returns Bearer JWT. Rejects pending/disabled accounts. |
| `GET` | `/auth/me` | Authenticated | Returns current authenticated user's profile and permissions. |
| `GET` | `/auth/verify-invitation` | Public | Validates invitation token for pending employee account. |
| `POST` | `/auth/complete-registration`| Public | Sets password and activates account using valid invitation token. |
| `POST` | `/auth/register` | Disabled | Public registration disabled (`HTTP 403`). All accounts created by Admin. |

### User Management (`/users`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/users/` | Admin, Support | Lists all registered users with optional role filtering. |
| `POST` | `/users/` | Admin Only | Creates pending user account and generates expiring invitation token. |
| `GET` | `/users/{user_id}` | Authenticated | Retrieves profile (Employees can only view self; Admin/Support can view all). |
| `PUT` | `/users/{user_id}` | Admin Only | Updates user details or role. Validates email uniqueness. |
| `POST` | `/users/{user_id}/reinvite`| Admin Only | Generates a fresh invitation token for pending accounts. |

### Assets (`/assets`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/assets` | Authenticated | Lists assets. Employees restricted strictly to their assigned hardware. |
| `POST` | `/assets` | Admin Only | Registers a new physical asset with serial number validation. |
| `GET` | `/assets/{asset_id}` | Authenticated | Asset details. Employees denied access to hardware assigned to others. |
| `POST` | `/assets/{asset_id}/assign` | Admin, Support | Assigns available asset to employee. |
| `POST` | `/assets/{asset_id}/return` | Admin, Support | Returns assigned asset back to available inventory. |

### Tickets (`/tickets`)
| Method | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tickets` | Authenticated | Lists tickets. Employees restricted to tickets created by them. |
| `POST` | `/tickets` | Authenticated | Creates support ticket with automated regex priority classification. |
| `GET` | `/tickets/{ticket_id}` | Authenticated | Ticket details. Employees denied access to tickets created by others. |
| `POST` | `/tickets/{ticket_id}/assign` | Admin Only | Assigns ticket to an active IT Support specialist. |
| `POST` | `/tickets/{ticket_id}/resolve`| Admin, Support | Resolves ticket with resolution notes and stops SLA clock. |
| `POST` | `/tickets/{ticket_id}/close` | Authenticated | Confirms closure. Standard employees can only close own resolved tickets. |

### Real-Time & WebSockets (`/ws`)
| Protocol | Path | Access | Description |
| :--- | :--- | :--- | :--- |
| `WS` | `/ws/tickets?token=...` | Authenticated | Live ticket events. Supports query token or in-band `auth` frame. |
| `WS Action` | `{"action": "subscribe", "ticket_id": "..."}` | Authenticated | Subscribes to ticket events. Validates ownership for employees. |
| `WS Action` | `{"action": "unsubscribe", "ticket_id": "..."}` | Authenticated | Unsubscribes from ticket notifications. |

---

## 🎓 Comprehensive College Viva Guide

### Q1: Why did you choose a Layered Architecture (Routes → Services → Repositories)?
> **Answer**: Layered architecture enforces the **Single Responsibility Principle**. 
> - **Routes** only handle HTTP protocol concerns (request extraction, HTTP status codes).
> - **Services** contain business logic (SLA calculations, regex classification, password hashing).
> - **Repositories** encapsulate SQLAlchemy database queries.
> If we ever migrate from MySQL to another database, only the Repository layer changes; business rules and API routes remain untouched.

### Q2: What is the Singleton Pattern and where is it used?
> **Answer**: The Singleton pattern ensures a class has only one instance and provides a global access point to it. In [`app/database/connection.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/database/connection.py), `DatabaseConnectionManager` is a Singleton. This prevents creating redundant database connection pools, which would exhaust database connections and degrade server performance.

### Q3: How is password security and authentication handled?
> **Answer**: Passwords are never stored in plain text. We use native **Bcrypt** with a cryptographically randomized salt (`bcrypt.gensalt()`). During authentication, credentials are verified using constant-time comparison via `bcrypt.checkpw()`. On successful authentication, FastAPI issues an **HMAC-SHA256 (HS256) signed JWT** with a 60-minute expiration containing the user ID, role claim, and account status.

### Q4: How does the Automatic Ticket Classifier work?
> **Answer**: It is implemented in [`app/services/ticket_classifier.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/services/ticket_classifier.py) using pure Python regex and dictionary lookups without external AI dependencies. It matches technical keywords (e.g., `wifi` → `Network`, `screen` → `Hardware`) and scans for emergency triggers (e.g., `down`, `bsod`, `urgent`) to assign an appropriate priority level (`CRITICAL`, `HIGH`, `MEDIUM`).

### Q5: How do WebSockets differ from standard REST APIs in this project?
> **Answer**: Standard REST APIs are client-initiated and request-response based; to get updates, the frontend would need to poll the server repeatedly. WebSockets establish a single persistent, bi-directional TCP connection over `/ws/tickets`. When a support engineer resolves a ticket, the backend broadcasts an instant notification frame to all connected dashboards with zero polling delay.

### Q6: What are Python Generators and why are they used?
> **Answer**: Generators use the `yield` keyword to return an iterator that yields one item at a time instead of loading entire datasets into RAM at once. In [`app/utils/generators.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/utils/generators.py), `stream_large_ticket_dataset()` processes ticket batches in chunks of 50, preventing memory exhaustion when exporting thousands of records.

### Q7: Where are Inheritance, Encapsulation, and Polymorphism applied?
> **Answer**: In [`app/models/asset.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/models/asset.py):
> - **Inheritance**: `Laptop`, `Monitor`, `Keyboard`, `Mouse`, `Printer` inherit from the base `Asset` class.
> - **Encapsulation**: The `serial_number` attribute is protected and accessed through a property setter that enforces length and uppercase validation.
> - **Polymorphism**: The `get_asset_type()` and `get_details()` methods are overridden in each subclass to provide specialized attributes (e.g., screen size for monitors, battery health for laptops).
> - **Composition**: A `HardwareSpecs` dataclass (RAM, processor, storage) is composed inside the `Laptop` class.

### Q8: How does the system handle database transactions (ACID)?
> **Answer**: We use SQLAlchemy's transactional session context manager in [`app/database/connection.py`](file:///c:/Users/Yash/OneDrive/Desktop/CAPSTONE%20PROJECT/app/database/connection.py). When a ticket is created, both the `TicketDB` record and the initial `TicketHistoryDB` entry are staged in the same session. If either step throws an error, `session.rollback()` is automatically invoked, guaranteeing **Atomicity**.
