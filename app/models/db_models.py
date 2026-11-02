"""
Database ORM Models for MySQL / Relational Database.

Meets Capstone Specification Sections 13, 31, and 32:
- Relational tables: users, assets, asset_assignments, tickets, ticket_history, activity_logs
- Enforces ACID constraints: Primary keys, Foreign keys, Unique indexes, NOT NULL constraints
- Compatible with MySQL (viewable in DBeaver), PostgreSQL, and SQLite
"""

from datetime import datetime, date, timezone
from typing import Dict, Any, Optional

from enum import Enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Date,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

def _iso_utc(dt: Optional[datetime]) -> Optional[str]:
    """Formats a datetime as an ISO-8601 string with explicit UTC timezone indicator."""
    if not dt:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()



class UserRole(str, Enum):
    """Supported user authorization roles."""
    ADMIN = "ADMIN"
    SUPPORT = "SUPPORT"
    EMPLOYEE = "EMPLOYEE"


class UserStatus(str, Enum):
    """User account lifecycle status."""
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    DISABLED = "DISABLED"


class UserDB(Base):
    """
    SQLAlchemy ORM Model for `users` table.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default=UserRole.EMPLOYEE.value)  # ADMIN, SUPPORT, EMPLOYEE
    status = Column(String(30), nullable=False, default=UserStatus.ACTIVE.value, server_default=UserStatus.ACTIVE.value)  # ACTIVE, PENDING, DISABLED
    invitation_token_hash = Column(String(255), nullable=True, index=True)
    invitation_expires_at = Column(DateTime, nullable=True)
    department = Column(String(100), nullable=True, default="General")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assigned_assets = relationship("AssetDB", back_populates="assignee", foreign_keys="AssetDB.assigned_to")
    created_tickets = relationship("TicketDB", back_populates="creator", foreign_keys="TicketDB.created_by")
    assigned_tickets = relationship("TicketDB", back_populates="handler", foreign_keys="TicketDB.assigned_to")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "status": self.status,
            "department": self.department,
            "created_at": _iso_utc(self.created_at),
        }



class AssetDB(Base):
    """
    SQLAlchemy ORM Model for `assets` table.
    """
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(String(50), nullable=False)  # Laptop, Monitor, Keyboard, Mouse, Printer
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)
    purchase_date = Column(Date, nullable=False, default=date.today)
    status = Column(String(30), nullable=False, default="AVAILABLE")  # AVAILABLE, ASSIGNED, UNDER_REPAIR, RETIRED, LOST
    assigned_to = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    specs_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    assignee = relationship("UserDB", back_populates="assigned_assets", foreign_keys=[assigned_to])
    assignment_history = relationship("AssetAssignmentDB", back_populates="asset", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "asset_id": self.asset_id,
            "type": self.type,
            "brand": self.brand,
            "model": self.model,
            "serial_number": self.serial_number,
            "purchase_date": self.purchase_date.isoformat() if self.purchase_date else None,
            "status": self.status,
            "assigned_to": self.assigned_to,
            "specs_json": self.specs_json,
        }


class AssetAssignmentDB(Base):
    """
    SQLAlchemy ORM Model for `asset_assignments` table.
    Tracks historical custody of hardware assets.
    """
    __tablename__ = "asset_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=False, index=True)
    employee_id = Column(String(50), ForeignKey("users.user_id"), nullable=False, index=True)
    assigned_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    returned_date = Column(DateTime, nullable=True)
    notes = Column(String(255), nullable=True)

    # Relationships
    asset = relationship("AssetDB", back_populates="assignment_history")


class TicketDB(Base):
    """
    SQLAlchemy ORM Model for `tickets` table.
    """
    __tablename__ = "tickets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(50), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), nullable=False)  # Hardware, Software, Network, Access, Other
    priority = Column(String(30), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), nullable=False, default="OPEN")  # OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    created_by = Column(String(50), ForeignKey("users.user_id"), nullable=False, index=True)
    assigned_to = Column(String(50), ForeignKey("users.user_id"), nullable=True, index=True)
    asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=True, index=True)
    resolution = Column(Text, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_date = Column(DateTime, nullable=True)

    # Relationships
    creator = relationship("UserDB", back_populates="created_tickets", foreign_keys=[created_by])
    handler = relationship("UserDB", back_populates="assigned_tickets", foreign_keys=[assigned_to])
    linked_asset = relationship("AssetDB", foreign_keys=[asset_id])
    history = relationship("TicketHistoryDB", back_populates="ticket", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "priority": self.priority,
            "status": self.status,
            "created_by": self.created_by,
            "assigned_to": self.assigned_to,
            "asset_id": self.asset_id,
            "resolution": self.resolution,
            "created_date": _iso_utc(self.created_date),
            "closed_date": _iso_utc(self.closed_date),
        }


class TicketHistoryDB(Base):
    """
    SQLAlchemy ORM Model for `ticket_history` audit trail.
    Tracks every status transition, manual assignment, and automatic assignment.
    """
    __tablename__ = "ticket_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(50), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    changed_by = Column(String(50), nullable=False)  # User ID or "SYSTEM"
    old_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    previous_assignee = Column(String(50), nullable=True)
    new_assignee = Column(String(50), nullable=True)
    assignment_method = Column(String(20), nullable=True)  # "MANUAL" or "AUTOMATIC"
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    ticket = relationship("TicketDB", back_populates="history")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "ticket_id": self.ticket_id,
            "changed_by": self.changed_by,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "previous_assignee": self.previous_assignee,
            "new_assignee": self.new_assignee,
            "assignment_method": self.assignment_method,
            "comment": self.comment,
            "timestamp": _iso_utc(self.timestamp),
        }


class ActivityLogDB(Base):
    """
    SQLAlchemy ORM Model for `activity_logs` table.
    """
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "details": self.details,
            "timestamp": _iso_utc(self.timestamp),
        }


class EquipmentRequestDB(Base):
    """
    Equipment Request model for new hardware provisioning workflow.
    Lifecycle: PENDING → APPROVED/REJECTED → PROVISIONED → VERIFIED → CLOSED
    """
    __tablename__ = "equipment_requests"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), unique=True, nullable=False, index=True)
    requested_by = Column(String(50), ForeignKey("users.user_id"), nullable=False, index=True)
    equipment_type = Column(String(100), nullable=False)  # Laptop, Monitor, Keyboard, Mouse, Printer, Other
    reason = Column(Text, nullable=False)
    status = Column(String(30), nullable=False, default="PENDING")  # PENDING, APPROVED, REJECTED, PROVISIONED, VERIFIED, CLOSED
    approved_by = Column(String(50), ForeignKey("users.user_id"), nullable=True)
    provisioned_asset_id = Column(String(50), ForeignKey("assets.asset_id"), nullable=True)
    admin_notes = Column(Text, nullable=True)
    employee_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Audit Trail Relationship
    history = relationship(
        "EquipmentRequestHistoryDB",
        back_populates="request",
        cascade="all, delete-orphan",
        order_by="EquipmentRequestHistoryDB.timestamp.asc()"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "request_id": self.request_id,
            "requested_by": self.requested_by,
            "equipment_type": self.equipment_type,
            "reason": self.reason,
            "status": self.status,
            "approved_by": self.approved_by,
            "provisioned_asset_id": self.provisioned_asset_id,
            "admin_notes": self.admin_notes,
            "employee_notes": self.employee_notes,
            "created_at": _iso_utc(self.created_at),
            "updated_at": _iso_utc(self.updated_at),
        }

class EquipmentRequestHistoryDB(Base):
    """
    SQLAlchemy ORM Model for `equipment_request_history` audit trail.
    Tracks every lifecycle action: CREATED, APPROVED, REJECTED, PROVISIONED, VERIFIED, CLOSED.
    """
    __tablename__ = "equipment_request_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    request_id = Column(String(50), ForeignKey("equipment_requests.request_id"), nullable=False, index=True)
    actor = Column(String(50), nullable=False)  # User ID who executed action
    action = Column(String(50), nullable=False)  # CREATED, APPROVED, REJECTED, PROVISIONED, VERIFIED, CLOSED
    old_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    asset_id = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    request = relationship("EquipmentRequestDB", back_populates="history")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "request_id": self.request_id,
            "actor": self.actor,
            "action": self.action,
            "old_status": self.old_status,
            "new_status": self.new_status,
            "asset_id": self.asset_id,
            "notes": self.notes,
            "timestamp": _iso_utc(self.timestamp),
        }

