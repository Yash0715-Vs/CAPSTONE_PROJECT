"""
Database ORM Models for MySQL / Relational Database.

Meets Capstone Specification Sections 13, 31, and 32:
- Relational tables: users, assets, asset_assignments, tickets, ticket_history, activity_logs
- Enforces ACID constraints: Primary keys, Foreign keys, Unique indexes, NOT NULL constraints
- Compatible with MySQL (viewable in DBeaver), PostgreSQL, and SQLite
"""

from datetime import datetime, date
from typing import Dict, Any

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
            "created_at": self.created_at.isoformat() if self.created_at else None,
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
    resolution = Column(Text, nullable=True)
    created_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    closed_date = Column(DateTime, nullable=True)

    # Relationships
    creator = relationship("UserDB", back_populates="created_tickets", foreign_keys=[created_by])
    handler = relationship("UserDB", back_populates="assigned_tickets", foreign_keys=[assigned_to])
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
            "resolution": self.resolution,
            "created_date": self.created_date.isoformat() if self.created_date else None,
            "closed_date": self.closed_date.isoformat() if self.closed_date else None,
        }


class TicketHistoryDB(Base):
    """
    SQLAlchemy ORM Model for `ticket_history` audit trail.
    """
    __tablename__ = "ticket_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticket_id = Column(String(50), ForeignKey("tickets.ticket_id"), nullable=False, index=True)
    changed_by = Column(String(50), ForeignKey("users.user_id"), nullable=False)
    old_status = Column(String(30), nullable=False)
    new_status = Column(String(30), nullable=False)
    comment = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    ticket = relationship("TicketDB", back_populates="history")


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
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
