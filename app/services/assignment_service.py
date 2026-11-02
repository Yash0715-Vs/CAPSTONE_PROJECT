"""
Automatic Ticket Assignment Service.

Meets Monday Technical Requirement:
- Finds active, eligible SUPPORT users.
- Calculates active ticket count (statuses: OPEN, ASSIGNED, IN_PROGRESS).
- Selects the specialist with the fewest active tickets (least loaded).
- Tie-breaker: specialist whose most recent assignment was furthest in the past (or user_id ascending).
- Records assignment in TicketHistoryDB with changed_by = 'SYSTEM'.
- Logs event in ActivityLogDB.
"""

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.db_models import UserDB, TicketDB, TicketHistoryDB
from app.database.repositories import TicketRepository, ActivityLogRepository

ACTIVE_TICKET_STATUSES = ("OPEN", "ASSIGNED", "IN_PROGRESS")


def get_least_loaded_support_user(db: Session) -> Optional[UserDB]:
    """
    Finds the active SUPPORT specialist with the minimum number of active tickets.
    Tie-breaking:
    1. Furthest time since last ticket assignment (earliest max assignment date)
    2. Deterministic user_id ascending
    """
    support_users = (
        db.query(UserDB)
        .filter(UserDB.role == "SUPPORT", UserDB.status == "ACTIVE")
        .all()
    )
    if not support_users:
        return None

    # Count active tickets per assigned_to user
    active_counts_query = (
        db.query(TicketDB.assigned_to, func.count(TicketDB.id).label("cnt"))
        .filter(TicketDB.status.in_(ACTIVE_TICKET_STATUSES))
        .filter(TicketDB.assigned_to.isnot(None))
        .group_by(TicketDB.assigned_to)
        .all()
    )
    counts = {row.assigned_to: row.cnt for row in active_counts_query}

    # Latest assigned timestamp per user for tie-breaking
    latest_assignments_query = (
        db.query(TicketDB.assigned_to, func.max(TicketDB.created_date).label("last_assigned"))
        .filter(TicketDB.assigned_to.isnot(None))
        .group_by(TicketDB.assigned_to)
        .all()
    )
    latest_assigned = {
        row.assigned_to: (row.last_assigned.timestamp() if row.last_assigned else 0)
        for row in latest_assignments_query
    }

    # Sort key: (active_count, last_assigned_epoch, user_id)
    # The user with lowest active count wins; tie-break prefers smallest epoch (furthest in past)
    sorted_specialists = sorted(
        support_users,
        key=lambda u: (
            counts.get(u.user_id, 0),
            latest_assigned.get(u.user_id, 0),
            u.user_id
        )
    )

    return sorted_specialists[0] if sorted_specialists else None


def auto_assign_ticket(db: Session, ticket_id: str) -> Optional[str]:
    """
    Executes automated ticket assignment under system policy.
    Sets status to ASSIGNED, assigned_to to least-loaded specialist,
    and logs SYSTEM as the actor in ticket history and activity logs.
    """
    ticket = TicketRepository.get_by_ticket_id(db, ticket_id)
    if not ticket:
        return None

    specialist = get_least_loaded_support_user(db)
    if not specialist:
        return None

    ticket.assigned_to = specialist.user_id
    ticket.status = "ASSIGNED"

    # Record history with SYSTEM actor
    TicketRepository.update_status(
        session=db,
        ticket_id=ticket_id,
        new_status="ASSIGNED",
        changed_by="SYSTEM",
        comment=f"Auto-assigned to {specialist.user_id} via least-load balancing policy"
    )

    ActivityLogRepository.log(
        session=db,
        action="TICKET_AUTO_ASSIGNED",
        user_id="SYSTEM",
        details=f"Auto-assigned ticket {ticket_id} to {specialist.user_id} ({specialist.name})"
    )

    db.flush()
    return specialist.user_id
