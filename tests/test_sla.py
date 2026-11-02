"""
Unit tests for SLA Management & Calculations.

Meets Capstone Specification Section 15:
- SLA calculation
- Deadline calculation via datetime/timedelta
- Active vs Breached status determination
- Resolution time duration and average resolution metrics
"""

from datetime import datetime, timedelta
import pytest

from app.models.ticket import Ticket, TicketPriority, TicketStatus
from app.services.sla_service import SLAService
from app.utils.exceptions import SLAConfigurationError


def test_sla_target_hours():
    """Validates priority-to-hours mapping."""
    assert SLAService.get_sla_target_hours(TicketPriority.CRITICAL) == 2
    assert SLAService.get_sla_target_hours(TicketPriority.HIGH) == 4
    assert SLAService.get_sla_target_hours(TicketPriority.MEDIUM) == 8
    assert SLAService.get_sla_target_hours(TicketPriority.LOW) == 24


def test_sla_active_ticket():
    """Tests active ticket deadline and remaining time."""
    created_time = datetime(2026, 10, 23, 10, 0, 0)
    ticket = Ticket(
        ticket_id="INC-1",
        title="Active incident",
        description="Active test description",
        created_by="EMP-1",
        priority=TicketPriority.HIGH,  # 4 hours -> deadline 14:00
        created_date=created_time,
    )
    check_time = datetime(2026, 10, 23, 12, 0, 0)  # 2 hours elapsed, 2 hours remaining
    status_info = SLAService.get_ticket_sla_status(ticket, current_time=check_time)

    assert status_info["is_breached"] is False
    assert status_info["sla_status"] == "SLA ACTIVE"
    assert "2h 0m remaining" in status_info["time_description"]


def test_sla_breached_ticket():
    """Tests breach detection when deadline has passed."""
    created_time = datetime(2026, 10, 23, 10, 0, 0)
    ticket = Ticket(
        ticket_id="INC-2",
        title="Emergency outage",
        description="Critical outage test description",
        created_by="EMP-2",
        priority=TicketPriority.CRITICAL,  # 2 hours -> deadline 12:00
        created_date=created_time,
    )
    check_time = datetime(2026, 10, 23, 13, 0, 0)  # Checked 1 hour after deadline
    status_info = SLAService.get_ticket_sla_status(ticket, current_time=check_time)

    assert status_info["is_breached"] is True
    assert status_info["sla_status"] == "SLA BREACHED"
    assert "BREACHED by 1h 0m" in status_info["time_description"]


def test_average_resolution_time_calculation():
    """Tests calculation of average resolution time across closed tickets."""
    base_time = datetime(2026, 10, 23, 9, 0, 0)
    t1 = Ticket(
        ticket_id="T1", title="Resolve test 1", description="Description 1",
        created_by="EMP-1", created_date=base_time,
        closed_date=base_time + timedelta(hours=1),
        status=TicketStatus.CLOSED,
    )
    t2 = Ticket(
        ticket_id="T2", title="Resolve test 2", description="Description 2",
        created_by="EMP-2", created_date=base_time,
        closed_date=base_time + timedelta(hours=3),
        status=TicketStatus.CLOSED,
    )

    stats = SLAService.calculate_average_resolution_time([t1, t2])
    assert stats["total_resolved"] == 2
    assert stats["average_resolution_minutes"] == 120.0  # (60 + 180) / 2 = 120 mins
    assert stats["average_resolution_human"] == "2h 0m"


def test_sla_report_metric_breakdown():
    """
    Pre-Day 3 Verification: Validates that GET /reports/sla returns mathematically
    consistent and distinct metrics for active overdue, active on-time,
    historical breached, and historical met SLA tickets.
    """
    from fastapi.testclient import TestClient
    from app.main import app

    client = TestClient(app)
    # Login as admin to get auth token
    login_res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    res = client.get("/reports/sla", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    total = data["total_tickets_analyzed"]
    breached = data["breached_count"]
    non_breached = data["non_breached_count"]
    active_overdue = data["active_overdue_count"]
    active_on_time = data["active_on_time_count"]
    historical_breached = data["historical_breached_count"]
    historical_met = data["historical_met_count"]

    # Verify mathematical integrity
    assert breached == active_overdue + historical_breached
    assert non_breached == active_on_time + historical_met
    assert total == breached + non_breached
    assert "compliance_rate" in data

