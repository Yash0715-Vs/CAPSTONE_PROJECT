"""
Support Ticket Model.

Defines the Ticket lifecycle, state transitions, priorities, and validation rules.
"""

import sys
from pathlib import Path
from datetime import datetime
from enum import Enum
from typing import Optional, Dict, Any

# Ensure project root is in sys.path so the file can be executed directly
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.utils.exceptions import InvalidTicketError, InvalidStatusTransitionError


class TicketCategory(str, Enum):
    """Ticket categories recognized by the system."""
    HARDWARE = "Hardware"
    SOFTWARE = "Software"
    NETWORK = "Network"
    ACCESS = "Access"
    OTHER = "Other"


class TicketPriority(str, Enum):
    """Ticket priority levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TicketStatus(str, Enum):
    """Ticket workflow states."""
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class Ticket:
    """
    Encapsulates support ticket state, lifecycle, and business rules.
    """
    def __init__(
        self,
        ticket_id: str,
        title: str,
        description: str,
        created_by: str,
        category: TicketCategory = TicketCategory.OTHER,
        priority: TicketPriority = TicketPriority.MEDIUM,
        assigned_to: Optional[str] = None,
        status: TicketStatus = TicketStatus.OPEN,
        created_date: Optional[datetime] = None,
        resolution: Optional[str] = None,
        closed_date: Optional[datetime] = None
    ):
        if not ticket_id or not ticket_id.strip():
            raise InvalidTicketError("Ticket ID cannot be empty.")
        if not title or len(title.strip()) < 3:
            raise InvalidTicketError("Title must be at least 3 characters long.")
        if not description or len(description.strip()) < 5:
            raise InvalidTicketError("Description must be at least 5 characters long.")
        if not created_by or not created_by.strip():
            raise InvalidTicketError("Ticket creator (created_by) must be specified.")

        self.ticket_id = ticket_id.strip()
        self.title = title.strip()
        self.description = description.strip()
        self.created_by = created_by.strip()
        self.category = category
        self.priority = priority

        self._status = status
        self._assigned_to = assigned_to
        self._resolution = resolution
        self.created_date = created_date or datetime.now()
        self.closed_date = closed_date

    @property
    def status(self) -> TicketStatus:
        return self._status

    @property
    def assigned_to(self) -> Optional[str]:
        return self._assigned_to

    @property
    def resolution(self) -> Optional[str]:
        return self._resolution

    def assign_to(self, it_support_id: str) -> None:
        """Assign ticket to an IT Support specialist."""
        if self._status == TicketStatus.CLOSED:
            raise InvalidStatusTransitionError(f"Cannot assign closed ticket '{self.ticket_id}'.")
        if not it_support_id or not it_support_id.strip():
            raise InvalidTicketError("IT Support specialist ID must be provided.")

        self._assigned_to = it_support_id.strip()
        if self._status == TicketStatus.OPEN:
            self._status = TicketStatus.ASSIGNED

    def start_progress(self) -> None:
        """Mark ticket as in-progress."""
        if self._status not in (TicketStatus.OPEN, TicketStatus.ASSIGNED):
            raise InvalidStatusTransitionError(
                f"Cannot start progress on ticket in status '{self._status.value}'."
            )
        self._status = TicketStatus.IN_PROGRESS

    def resolve(self, resolution_notes: str) -> None:
        """Resolve the ticket with explanatory resolution notes."""
        if self._status in (TicketStatus.CLOSED, TicketStatus.RESOLVED):
            raise InvalidStatusTransitionError(
                f"Ticket '{self.ticket_id}' is already {self._status.value}."
            )
        if not resolution_notes or len(resolution_notes.strip()) < 5:
            raise InvalidTicketError("Resolution notes must be at least 5 characters long.")

        self._resolution = resolution_notes.strip()
        self._status = TicketStatus.RESOLVED

    def close(self) -> None:
        """Close the ticket after resolution."""
        if self._status != TicketStatus.RESOLVED:
            raise InvalidStatusTransitionError(
                f"Cannot close ticket '{self.ticket_id}' before it is RESOLVED (current: {self._status.value})."
            )
        self._status = TicketStatus.CLOSED
        self.closed_date = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convert ticket instance to dictionary representation."""
        return {
            "ticket_id": self.ticket_id,
            "title": self.title,
            "description": self.description,
            "category": self.category.value if isinstance(self.category, TicketCategory) else str(self.category),
            "priority": self.priority.value if isinstance(self.priority, TicketPriority) else str(self.priority),
            "created_by": self.created_by,
            "assigned_to": self._assigned_to,
            "status": self._status.value if isinstance(self._status, TicketStatus) else str(self._status),
            "resolution": self._resolution,
            "created_date": self.created_date.isoformat(),
            "closed_date": self.closed_date.isoformat() if self.closed_date else None,
        }

    def __repr__(self) -> str:
        return f"<Ticket id={self.ticket_id} priority={self.priority.value} status={self.status.value}>"


if __name__ == "__main__":
    import json

    print("=" * 60)
    print("RUNNING TICKET LIFECYCLE & WORKFLOW DEMO")
    print("=" * 60)

    # 1. Create a support ticket
    ticket = Ticket(
        ticket_id="INC-1024",
        title="Laptop does not boot up",
        description="Screen remains black with power button LED blinking amber.",
        created_by="EMP-102",
        category=TicketCategory.HARDWARE,
        priority=TicketPriority.HIGH
    )
    print("\n[+] Created New Support Ticket:")
    print(json.dumps(ticket.to_dict(), indent=2))

    # 2. Assign to IT Support
    print("\n[+] Assigning ticket to IT specialist IT-501...")
    ticket.assign_to("IT-501")
    print(f"Status: {ticket.status.value} | Assigned To: {ticket.assigned_to}")

    # 3. Start progress
    print("\n[+] Moving ticket to IN_PROGRESS...")
    ticket.start_progress()
    print(f"Status: {ticket.status.value}")

    # 4. Resolve ticket
    print("\n[+] Resolving ticket with diagnostic notes...")
    ticket.resolve("Replaced faulty RAM module; system boots properly.")
    print(f"Status: {ticket.status.value} | Resolution: {ticket.resolution}")

    # 5. Close ticket
    print("\n[+] Closing ticket after user confirmation...")
    ticket.close()
    print(f"Status: {ticket.status.value} | Closed At: {ticket.closed_date}")

    # 6. Test Error Handling: Cannot assign a closed ticket
    print("\n[!] Testing Error Handling (Assigning closed ticket):")
    try:
        ticket.assign_to("IT-999")
    except InvalidStatusTransitionError as err:
        print(f"    Caught Expected Exception: {err}")

    print("\n" + "=" * 60)
    print("ALL TICKET WORKFLOW TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

