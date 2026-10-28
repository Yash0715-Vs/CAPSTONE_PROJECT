"""
Tickets API Endpoints.

Meets Capstone Specification Section 12:
- GET    /tickets
- GET    /tickets/{ticket_id}
- POST   /tickets (Automatically hooks into TicketClassifier!)
- PUT    /tickets/{ticket_id}
- POST   /tickets/{ticket_id}/assign
- POST   /tickets/{ticket_id}/resolve
- POST   /tickets/{ticket_id}/close
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import TicketRepository, UserRepository, ActivityLogRepository
from app.models.db_models import TicketDB, UserDB
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketResponse,
    TicketAssignRequest,
    TicketResolveRequest,
)
from app.services.auth_service import get_current_user, require_roles
from app.services.ticket_classifier import TicketClassifier

router = APIRouter(prefix="/tickets", tags=["Tickets"])


@router.get("", response_model=List[TicketResponse])
def list_tickets(
    status_filter: Optional[str] = Query(None, alias="status"),
    category_filter: Optional[str] = Query(None, alias="category"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Lists support tickets.
    Employees see only tickets created by them.
    IT Support and Admin can view all tickets across the organization.
    """
    user_id_filter = current_user.user_id if current_user.role == "EMPLOYEE" else None
    return TicketRepository.list_tickets(
        session=session,
        status=status_filter,
        category=category_filter,
        priority=priority_filter,
        user_id=user_id_filter
    )


@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket_by_id(
    ticket_id: str,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Retrieves specific ticket details."""
    ticket = TicketRepository.get_by_ticket_id(session, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{ticket_id}' not found.")

    if current_user.role == "EMPLOYEE" and ticket.created_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to view your own support tickets."
        )
    return ticket


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
def create_ticket(
    ticket_in: TicketCreate,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Creates a new support ticket.
    If category or priority is not provided by the user,
    our Rule-Based TicketClassifier (Regex) automatically infers them!
    """
    category = ticket_in.category
    priority = ticket_in.priority

    # Automatic Ticket Classification (Section 6)
    if not category or not priority:
        classification = TicketClassifier.classify_ticket(ticket_in.title, ticket_in.description)
        category = category or classification["category_name"]
        priority = priority or classification["priority_name"]

    # Generate next Ticket ID (e.g. INC-1005)
    existing_count = len(TicketRepository.list_tickets(session))
    generated_ticket_id = f"INC-{1000 + existing_count + 1}"

    ticket = TicketDB(
        ticket_id=generated_ticket_id,
        title=ticket_in.title,
        description=ticket_in.description,
        category=category,
        priority=priority,
        status="OPEN",
        created_by=current_user.user_id,
        created_date=datetime.now(timezone.utc),
    )
    saved = TicketRepository.create(session, ticket)
    ActivityLogRepository.log(
        session, "TICKET_CREATED", current_user.user_id, f"Created {saved.ticket_id} ({category}/{priority})"
    )
    return saved


@router.put("/{ticket_id}", response_model=TicketResponse)
def update_ticket(
    ticket_id: str,
    update_in: TicketUpdate,
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Updates ticket priority, category, or title (Admin / Support only)."""
    ticket = TicketRepository.get_by_ticket_id(session, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{ticket_id}' not found.")

    if update_in.title:
        ticket.title = update_in.title
    if update_in.description:
        ticket.description = update_in.description
    if update_in.category:
        ticket.category = update_in.category
    if update_in.priority:
        ticket.priority = update_in.priority
    if update_in.status:
        TicketRepository.update_status(session, ticket_id, update_in.status, staff_user.user_id)

    session.flush()
    ActivityLogRepository.log(session, "TICKET_UPDATED", staff_user.user_id, f"Updated ticket {ticket_id}")
    return ticket


@router.post("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(
    ticket_id: str,
    assign_req: TicketAssignRequest,
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Assigns ticket to an IT Support specialist."""
    ticket = TicketRepository.get_by_ticket_id(session, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{ticket_id}' not found.")

    support_user = UserRepository.get_by_user_id(session, assign_req.assigned_to)
    if not support_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"IT Support user '{assign_req.assigned_to}' not found."
        )

    ticket.assigned_to = assign_req.assigned_to
    TicketRepository.update_status(
        session=session,
        ticket_id=ticket_id,
        new_status="ASSIGNED",
        changed_by=staff_user.user_id,
        comment=f"Assigned to {assign_req.assigned_to}"
    )
    session.flush()
    return ticket


@router.post("/{ticket_id}/resolve", response_model=TicketResponse)
def resolve_ticket(
    ticket_id: str,
    resolve_req: TicketResolveRequest,
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Resolves a ticket with explanatory resolution notes."""
    ticket = TicketRepository.get_by_ticket_id(session, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{ticket_id}' not found.")

    ticket.resolution = resolve_req.resolution
    TicketRepository.update_status(
        session=session,
        ticket_id=ticket_id,
        new_status="RESOLVED",
        changed_by=staff_user.user_id,
        comment=f"Resolved: {resolve_req.resolution}"
    )
    session.flush()
    return ticket


@router.post("/{ticket_id}/close", response_model=TicketResponse)
def close_ticket(
    ticket_id: str,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Closes a ticket after resolution confirmation."""
    ticket = TicketRepository.get_by_ticket_id(session, ticket_id)
    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Ticket '{ticket_id}' not found.")

    if ticket.status != "RESOLVED" and current_user.role == "EMPLOYEE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close ticket '{ticket_id}' before it is RESOLVED (current status: {ticket.status})."
        )

    ticket.closed_date = datetime.now(timezone.utc)
    TicketRepository.update_status(
        session=session,
        ticket_id=ticket_id,
        new_status="CLOSED",
        changed_by=current_user.user_id,
        comment="Ticket confirmed and closed."
    )
    session.flush()
    return ticket
