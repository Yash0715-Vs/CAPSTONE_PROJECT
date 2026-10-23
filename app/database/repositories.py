"""
Repository / Data Access Layer.

Meets Capstone Specification Section 29.1 (Layered Architecture):
Separates database query logic from business services and API endpoints.
Provides clean CRUD interfaces for Users, Assets, Tickets, and Activity Logs.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.db_models import (
    UserDB,
    AssetDB,
    AssetAssignmentDB,
    TicketDB,
    TicketHistoryDB,
    ActivityLogDB,
)


class UserRepository:
    """Repository handling all database operations for Users."""

    @staticmethod
    def create(session: Session, user: UserDB) -> UserDB:
        session.add(user)
        session.flush()
        return user

    @staticmethod
    def get_by_user_id(session: Session, user_id: str) -> Optional[UserDB]:
        return session.query(UserDB).filter(UserDB.user_id == user_id).first()

    @staticmethod
    def get_by_email(session: Session, email: str) -> Optional[UserDB]:
        return session.query(UserDB).filter(UserDB.email == email).first()

    @staticmethod
    def list_all(session: Session) -> List[UserDB]:
        return session.query(UserDB).order_by(UserDB.user_id).all()


class AssetRepository:
    """Repository handling all database operations for Assets."""

    @staticmethod
    def create(session: Session, asset: AssetDB) -> AssetDB:
        session.add(asset)
        session.flush()
        return asset

    @staticmethod
    def get_by_asset_id(session: Session, asset_id: str) -> Optional[AssetDB]:
        return session.query(AssetDB).filter(AssetDB.asset_id == asset_id).first()

    @staticmethod
    def list_assets(
        session: Session,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None
    ) -> List[AssetDB]:
        query = session.query(AssetDB)
        if status:
            query = query.filter(AssetDB.status == status)
        if assigned_to:
            query = query.filter(AssetDB.assigned_to == assigned_to)
        return query.order_by(AssetDB.asset_id).all()

    @staticmethod
    def assign_asset(
        session: Session, asset_id: str, employee_id: str, notes: Optional[str] = None
    ) -> AssetDB:
        asset = AssetRepository.get_by_asset_id(session, asset_id)
        if not asset:
            raise ValueError(f"Asset '{asset_id}' not found.")

        asset.assigned_to = employee_id
        asset.status = "ASSIGNED"

        # Record assignment log (ACID transaction)
        assignment_log = AssetAssignmentDB(
            asset_id=asset_id,
            employee_id=employee_id,
            assigned_date=datetime.utcnow(),
            notes=notes
        )
        session.add(assignment_log)
        session.flush()
        return asset

    @staticmethod
    def return_asset(session: Session, asset_id: str) -> AssetDB:
        asset = AssetRepository.get_by_asset_id(session, asset_id)
        if not asset:
            raise ValueError(f"Asset '{asset_id}' not found.")

        # Update assignment record with return date
        latest_assignment = (
            session.query(AssetAssignmentDB)
            .filter(
                AssetAssignmentDB.asset_id == asset_id,
                AssetAssignmentDB.returned_date.is_(None)
            )
            .order_by(desc(AssetAssignmentDB.assigned_date))
            .first()
        )
        if latest_assignment:
            latest_assignment.returned_date = datetime.utcnow()

        asset.assigned_to = None
        asset.status = "AVAILABLE"
        session.flush()
        return asset


class TicketRepository:
    """Repository handling all database operations for Tickets."""

    @staticmethod
    def create(session: Session, ticket: TicketDB) -> TicketDB:
        session.add(ticket)
        session.flush()

        # Initial history record
        history = TicketHistoryDB(
            ticket_id=ticket.ticket_id,
            changed_by=ticket.created_by,
            old_status="NONE",
            new_status=ticket.status,
            comment="Ticket created",
            timestamp=datetime.utcnow()
        )
        session.add(history)
        session.flush()
        return ticket

    @staticmethod
    def get_by_ticket_id(session: Session, ticket_id: str) -> Optional[TicketDB]:
        return session.query(TicketDB).filter(TicketDB.ticket_id == ticket_id).first()

    @staticmethod
    def list_tickets(
        session: Session,
        status: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[TicketDB]:
        query = session.query(TicketDB)
        if status:
            query = query.filter(TicketDB.status == status)
        if category:
            query = query.filter(TicketDB.category == category)
        if priority:
            query = query.filter(TicketDB.priority == priority)
        if user_id:
            query = query.filter(
                (TicketDB.created_by == user_id) | (TicketDB.assigned_to == user_id)
            )
        return query.order_by(desc(TicketDB.created_date)).all()

    @staticmethod
    def update_status(
        session: Session,
        ticket_id: str,
        new_status: str,
        changed_by: str,
        comment: Optional[str] = None
    ) -> TicketDB:
        ticket = TicketRepository.get_by_ticket_id(session, ticket_id)
        if not ticket:
            raise ValueError(f"Ticket '{ticket_id}' not found.")

        old_status = ticket.status
        ticket.status = new_status
        if new_status == "CLOSED":
            ticket.closed_date = datetime.utcnow()

        # Audit log in ticket_history table
        history = TicketHistoryDB(
            ticket_id=ticket_id,
            changed_by=changed_by,
            old_status=old_status,
            new_status=new_status,
            comment=comment or f"Status changed to {new_status}",
            timestamp=datetime.utcnow()
        )
        session.add(history)
        session.flush()
        return ticket


class ActivityLogRepository:
    """Repository handling system audit and activity logging."""

    @staticmethod
    def log(
        session: Session, action: str, user_id: Optional[str] = None, details: Optional[str] = None
    ) -> ActivityLogDB:
        entry = ActivityLogDB(
            action=action,
            user_id=user_id,
            details=details,
            timestamp=datetime.utcnow()
        )
        session.add(entry)
        session.flush()
        return entry

    @staticmethod
    def list_recent(session: Session, limit: int = 50) -> List[ActivityLogDB]:
        return (
            session.query(ActivityLogDB)
            .order_by(desc(ActivityLogDB.timestamp))
            .limit(limit)
            .all()
        )
