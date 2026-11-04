"""
Automatic Ticket Assignment Service.

Meets Monday Technical Requirement:
- Finds active, eligible SUPPORT users.
- Calculates active ticket count (statuses: OPEN, ASSIGNED, IN_PROGRESS).
- Selects the specialist with the fewest active tickets (least loaded).
- Tie-breaker: specialist whose most recent assignment was furthest in the past (or user_id ascending).
- Records assignment in TicketHistoryDB with changed_by = 'SYSTEM', previous_assignee, new_assignee, and method = 'AUTOMATIC'.
- Concurrency-safe: serialized via thread-lock and DB transaction-level locks to prevent race conditions during bursts.
- Logs event in ActivityLogDB.
"""

import threading
from contextlib import contextmanager
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, text

from app.models.db_models import UserDB, TicketDB, TicketHistoryDB
from app.database.repositories import TicketRepository, ActivityLogRepository

ACTIVE_TICKET_STATUSES = ("OPEN", "ASSIGNED", "IN_PROGRESS")

# Concurrency lock to serialize in-process auto-assignments and eliminate stale-calculation race conditions
_assignment_lock = threading.Lock()


@contextmanager
def acquire_assignment_lock(db: Session, timeout_seconds: int = 10):
    """
    Acquires both an in-process thread lock and a distributed database-level lock (MySQL GET_LOCK / Postgres advisory lock)
    to serialize ticket assignments across multiple Uvicorn/Gunicorn worker processes.
    Also invalidates SQLAlchemy identity map cache (db.expire_all()) to eliminate stale snapshots under MVCC.
    """
    dialect_name = ""
    try:
        bind = db.get_bind()
        if bind and hasattr(bind, "dialect"):
            dialect_name = bind.dialect.name
    except Exception:
        pass

    is_mysql = dialect_name == "mysql"
    is_pg = dialect_name == "postgresql"
    got_mysql_lock = False

    with _assignment_lock:
        if is_mysql:
            try:
                res = db.execute(
                    text("SELECT GET_LOCK('auto_assignment_global_lock', :timeout)"),
                    {"timeout": timeout_seconds}
                ).scalar()
                got_mysql_lock = (res == 1)
            except Exception:
                got_mysql_lock = False
            if not got_mysql_lock:
                raise TimeoutError("Failed to acquire distributed lock for ticket auto-assignment")
        elif is_pg:
            try:
                db.execute(text("SELECT pg_advisory_xact_lock(hashtext('auto_assignment_global_lock'))"))
            except Exception:
                pass
            except Exception:
                pass

        try:
            db.expire_all()
            yield
        finally:
            if is_mysql and got_mysql_lock:
                try:
                    db.execute(text("SELECT RELEASE_LOCK('auto_assignment_global_lock')"))
                except Exception:
                    pass


def get_least_loaded_support_user(
    db: Session, exclude_user_ids: Optional[List[str]] = None
) -> Optional[UserDB]:
    """
    Finds the active SUPPORT specialist with the minimum number of active tickets.
    Optionally excludes specified user IDs (e.g. for peer reassignments).
    Tie-breaking:
    1. Furthest time since last ticket assignment (earliest max assignment date)
    2. Deterministic user_id ascending
    """
    db.expire_all()
    support_users_query = db.query(UserDB).filter(UserDB.role == "SUPPORT", UserDB.status == "ACTIVE")
    if exclude_user_ids:
        support_users_query = support_users_query.filter(~UserDB.user_id.in_(exclude_user_ids))
    if db.bind and db.bind.dialect.name in ("mysql", "postgresql"):
        support_users_query = support_users_query.with_for_update()
    support_users = support_users_query.all()

    if not support_users:
        return None

    # Count active tickets per assigned_to user (excluding RESOLVED and CLOSED)
    active_counts_query = (
        db.query(TicketDB.assigned_to, func.count(TicketDB.id).label("cnt"))
        .filter(TicketDB.status.in_(ACTIVE_TICKET_STATUSES))
        .filter(TicketDB.assigned_to.isnot(None))
        .group_by(TicketDB.assigned_to)
        .all()
    )
    counts = {row.assigned_to: row.cnt for row in active_counts_query}

    # Latest assignment event timestamp per support user from TicketHistoryDB for tie-breaking.
    # Uses actual assignment event timestamp (TicketHistoryDB.timestamp) rather than ticket creation date,
    # ensuring reassignments and recent work allocations update the tie-breaker correctly.
    latest_assignments_query = (
        db.query(TicketHistoryDB.new_assignee, func.max(TicketHistoryDB.timestamp).label("last_assigned"))
        .filter(TicketHistoryDB.new_assignee.isnot(None))
        .group_by(TicketHistoryDB.new_assignee)
        .all()
    )
    latest_assigned = {
        row.new_assignee: (row.last_assigned.timestamp() if row.last_assigned else 0)
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
    Concurrency-safe across multi-worker processes and multi-threaded request handling.
    """
    with acquire_assignment_lock(db):
        ticket = TicketRepository.get_by_ticket_id(db, ticket_id)
        if not ticket:
            return None

        specialist = get_least_loaded_support_user(db)
        if not specialist:
            return None

        old_assignee = ticket.assigned_to
        ticket.assigned_to = specialist.user_id

        # Record history with SYSTEM actor and explicit assignment audit fields.
        # TicketRepository.update_status transitions ticket.status and records true old_status (e.g. OPEN -> ASSIGNED).
        TicketRepository.update_status(
            session=db,
            ticket_id=ticket_id,
            new_status="ASSIGNED",
            changed_by="SYSTEM",
            comment=f"Auto-assigned to {specialist.user_id} via least-load balancing policy",
            previous_assignee=old_assignee,
            new_assignee=specialist.user_id,
            assignment_method="AUTOMATIC"
        )

        ActivityLogRepository.log(
            session=db,
            action="TICKET_AUTO_ASSIGNED",
            user_id="SYSTEM",
            details=f"Auto-assigned ticket {ticket_id} to {specialist.user_id} ({specialist.name})"
        )

        db.flush()
        return specialist.user_id
