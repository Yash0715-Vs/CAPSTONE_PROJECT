"""
Unit tests for Ticket Management & Auto-Classification.

Meets Capstone Specification Section 15:
- Ticket creation and lifecycle
- Validation errors and custom exceptions
- Status transitions (OPEN -> ASSIGNED -> IN_PROGRESS -> RESOLVED -> CLOSED)
- Rule-based regex ticket classification
"""

import pytest

from app.models.ticket import (
    Ticket,
    TicketCategory,
    TicketPriority,
    TicketStatus,
)
from app.services.ticket_classifier import TicketClassifier
from app.utils.exceptions import InvalidTicketError, InvalidStatusTransitionError


def test_ticket_lifecycle_transitions():
    """Tests the standard progression of a ticket from creation to closure."""
    ticket = Ticket(
        ticket_id="INC-101",
        title="Laptop keyboard unresponsive",
        description="Keys Q, W, E do not register keystrokes",
        created_by="EMP-101",
        category=TicketCategory.HARDWARE,
        priority=TicketPriority.MEDIUM,
    )
    assert ticket.status == TicketStatus.OPEN
    assert ticket.assigned_to is None

    # 1. Assign to support
    ticket.assign_to("IT-501")
    assert ticket.status == TicketStatus.ASSIGNED
    assert ticket.assigned_to == "IT-501"

    # 2. Start progress
    ticket.start_progress()
    assert ticket.status == TicketStatus.IN_PROGRESS

    # 3. Resolve
    ticket.resolve("Replaced keyboard membrane.")
    assert ticket.status == TicketStatus.RESOLVED
    assert ticket.resolution == "Replaced keyboard membrane."

    # 4. Close
    ticket.close()
    assert ticket.status == TicketStatus.CLOSED
    assert ticket.closed_date is not None


def test_ticket_invalid_title():
    """Rejects ticket with title shorter than 3 characters."""
    with pytest.raises(InvalidTicketError):
        Ticket(
            ticket_id="INC-999",
            title="NO",
            description="Valid long description",
            created_by="EMP-101",
        )


def test_cannot_close_unresolved_ticket():
    """Validates that a ticket cannot be CLOSED before being RESOLVED."""
    ticket = Ticket(
        ticket_id="INC-202",
        title="VPN failure",
        description="Cannot connect to company VPN gateway",
        created_by="EMP-102",
    )
    with pytest.raises(InvalidStatusTransitionError):
        ticket.close()


def test_cannot_assign_closed_ticket():
    """Validates that closed tickets cannot be reassigned."""
    ticket = Ticket(
        ticket_id="INC-303",
        title="Screen flicker",
        description="Monitor flickers occasionally",
        created_by="EMP-103",
    )
    ticket.assign_to("IT-501")
    ticket.start_progress()
    ticket.resolve("Updated graphics drivers")
    ticket.close()

    with pytest.raises(InvalidStatusTransitionError):
        ticket.assign_to("IT-502")


def test_ticket_classifier_hardware():
    """Tests automatic classification for hardware issues."""
    category, priority = TicketClassifier.classify_text("Laptop not booting and black screen")
    assert category == TicketCategory.HARDWARE
    assert priority == TicketPriority.HIGH


def test_ticket_classifier_network():
    """Tests automatic classification for network outages."""
    category, priority = TicketClassifier.classify_text("Emergency: Entire office WiFi disconnected")
    assert category == TicketCategory.NETWORK
    assert priority == TicketPriority.CRITICAL


def test_ticket_classifier_access():
    """Tests automatic classification for login and credential issues."""
    category, priority = TicketClassifier.classify_text("Account locked out after entering wrong password")
    assert category == TicketCategory.ACCESS
    assert priority in (TicketPriority.HIGH, TicketPriority.MEDIUM)
