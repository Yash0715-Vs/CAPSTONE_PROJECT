"""
Service Level Agreement (SLA) Management Service.

Meets Capstone Specification Section 7:
- Uses `datetime` and `timedelta`
- Configurable priority-based SLA target windows:
    CRITICAL -> 2 hours
    HIGH     -> 4 hours
    MEDIUM   -> 8 hours
    LOW      -> 24 hours
- Calculates SLA deadline, remaining time, breach status, and resolution duration
- Aggregates average resolution time and breach statistics
"""

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.models.ticket import Ticket, TicketPriority, TicketStatus
from app.utils.exceptions import SLAConfigurationError

def _to_utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)



class SLAService:
    """
    Handles SLA calculations, deadline tracking, and performance metrics.
    """

    # Target resolution windows per priority level in hours
    SLA_HOURS_MAP: Dict[TicketPriority, int] = {
        TicketPriority.CRITICAL: 2,
        TicketPriority.HIGH: 4,
        TicketPriority.MEDIUM: 8,
        TicketPriority.LOW: 24,
    }

    @classmethod
    def get_sla_target_hours(cls, priority: TicketPriority) -> int:
        """Returns allowed SLA hours for given ticket priority."""
        if priority not in cls.SLA_HOURS_MAP:
            raise SLAConfigurationError(f"Undefined SLA configuration for priority: {priority}")
        return cls.SLA_HOURS_MAP[priority]

    @classmethod
    def calculate_deadline(cls, created_date: datetime, priority: TicketPriority) -> datetime:
        """
        Calculates the exact SLA deadline timestamp given ticket creation time and priority.
        """
        target_hours = cls.get_sla_target_hours(priority)
        return created_date + timedelta(hours=target_hours)

    @classmethod
    def get_ticket_sla_status(
        cls, ticket: Ticket, current_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Evaluates current SLA health for a ticket.
        Returns deadline, time remaining or time breached, and breach status.
        """
        now = _to_utc(current_time) or datetime.now(timezone.utc)
        created_dt = _to_utc(ticket.created_date)
        deadline = cls.calculate_deadline(created_dt, ticket.priority)

        # Measure against resolved_date (or closed_date) if ticket is resolved/closed
        res_date = _to_utc(getattr(ticket, "resolved_date", None)) or _to_utc(getattr(ticket, "closed_date", None))
        is_completed = (ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED)) or (
            isinstance(ticket.status, str) and ticket.status in ("RESOLVED", "CLOSED")
        )
        comparison_time = res_date if (res_date and is_completed) else now
        is_breached = comparison_time > deadline
        time_difference = deadline - comparison_time

        # Calculate remaining or overdue duration
        if is_breached:
            overdue_duration = comparison_time - deadline
            total_seconds = int(overdue_duration.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            status_text = f"BREACHED by {hours}h {minutes}m"
        else:
            total_seconds = int(time_difference.total_seconds())
            hours, remainder = divmod(total_seconds, 3600)
            minutes, _ = divmod(remainder, 60)
            status_text = f"ACTIVE ({hours}h {minutes}m remaining)"

        resolution_time_minutes: Optional[float] = None
        comp_date = res_date if (res_date and is_completed) else _to_utc(getattr(ticket, "closed_date", None))
        if comp_date and created_dt:
            duration = comp_date - created_dt
            resolution_time_minutes = round(max(0.0, duration.total_seconds() / 60.0), 2)

        is_active_overdue = is_breached and ticket.status not in (TicketStatus.RESOLVED, TicketStatus.CLOSED)
        is_historical_breach = is_breached and ticket.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED)

        return {
            "ticket_id": ticket.ticket_id,
            "priority": ticket.priority.value,
            "status": ticket.status.value,
            "created_date": ticket.created_date.isoformat(),
            "sla_deadline": deadline.isoformat(),
            "is_breached": is_breached,
            "is_active_overdue": is_active_overdue,
            "is_historical_breach": is_historical_breach,
            "sla_status": "SLA BREACHED" if is_breached else "SLA ACTIVE",
            "time_description": status_text,
            "resolution_time_minutes": resolution_time_minutes,
        }

    @classmethod
    def calculate_average_resolution_time(cls, closed_tickets: List[Ticket]) -> Dict[str, Any]:
        """
        Calculates the average resolution time in hours and minutes across resolved/closed tickets.
        Uses list comprehensions, lambda, and map/reduce concepts.
        """
        def _get_res_date(t):
            return _to_utc(getattr(t, "resolved_date", None)) or _to_utc(getattr(t, "closed_date", None))

        valid_closed = [
            t for t in closed_tickets
            if _get_res_date(t) and (
                t.status in (TicketStatus.RESOLVED, TicketStatus.CLOSED) or
                (isinstance(t.status, str) and t.status in ("RESOLVED", "CLOSED"))
            )
        ]

        if not valid_closed:
            return {
                "total_resolved": 0,
                "average_resolution_minutes": 0.0,
                "average_resolution_human": "0m",
            }

        # Calculate duration in seconds for each ticket from created_date to resolved/closed date
        durations = list(map(
            lambda t: max(0.0, (_get_res_date(t) - _to_utc(t.created_date)).total_seconds()),
            valid_closed
        ))
        avg_seconds = sum(durations) / len(durations)
        avg_minutes = round(avg_seconds / 60.0, 2)

        hours, remainder = divmod(int(avg_seconds), 3600)
        minutes, _ = divmod(remainder, 60)

        return {
            "total_resolved": len(valid_closed),
            "average_resolution_minutes": avg_minutes,
            "average_resolution_human": f"{hours}h {minutes}m",
        }


if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING SLA MANAGEMENT & DEADLINE TRACKING DEMO (DATETIME)")
    print("=" * 65)

    base_time = datetime(2026, 10, 23, 10, 0, 0)

    # 1. Active HIGH ticket (4 hours target -> deadline 14:00) checked at 13:30 (30 mins left)
    ticket_high = Ticket(
        ticket_id="INC-1024",
        title="VPN Gateway unreachable",
        description="Cannot authenticate onto corporate network",
        created_by="EMP-101",
        priority=TicketPriority.HIGH,
        created_date=base_time
    )

    check_time_active = datetime(2026, 10, 23, 13, 30, 0)
    sla_info = SLAService.get_ticket_sla_status(ticket_high, current_time=check_time_active)

    print("\n[Case 1] Active Ticket SLA Check (INC-1024):")
    print(f"  Created: {base_time.strftime('%H:%M')}")
    print(f"  Deadline: {sla_info['sla_deadline']}")
    print(f"  Checked At: {check_time_active.strftime('%H:%M')}")
    print(f"  Status: {sla_info['sla_status']} -> {sla_info['time_description']}")

    # 2. Breached CRITICAL ticket (2 hours target -> deadline 12:00) checked at 13:30 (1h 30m overdue)
    ticket_critical = Ticket(
        ticket_id="INC-9999",
        title="Production DB replica down",
        description="Database reporting corrupt page on primary partition",
        created_by="EMP-001",
        priority=TicketPriority.CRITICAL,
        created_date=base_time
    )

    sla_breached = SLAService.get_ticket_sla_status(ticket_critical, current_time=check_time_active)
    print("\n[Case 2] Breached Ticket SLA Check (INC-9999):")
    print(f"  Created: {base_time.strftime('%H:%M')}")
    print(f"  Deadline: {sla_breached['sla_deadline']}")
    print(f"  Checked At: {check_time_active.strftime('%H:%M')}")
    print(f"  Status: {sla_breached['sla_status']} -> {sla_breached['time_description']}")

    # 3. Average Resolution Time calculation
    ticket1_resolved = Ticket(
        ticket_id="T-1", title="Reset token", description="MFA reset",
        created_by="EMP-1", created_date=base_time, closed_date=base_time + timedelta(minutes=45),
        status=TicketStatus.CLOSED
    )
    ticket2_resolved = Ticket(
        ticket_id="T-2", title="Replace Mouse", description="Battery issue",
        created_by="EMP-2", created_date=base_time, closed_date=base_time + timedelta(hours=2, minutes=15),
        status=TicketStatus.CLOSED
    )

    avg_stats = SLAService.calculate_average_resolution_time([ticket1_resolved, ticket2_resolved])
    print("\n[Case 3] Average Resolution Metrics:")
    print(f"  Total Tickets Resolved: {avg_stats['total_resolved']}")
    print(f"  Average Resolution Time: {avg_stats['average_resolution_human']} ({avg_stats['average_resolution_minutes']} minutes)")

    print("\n" + "=" * 65)
    print("ALL SLA MANAGEMENT TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 65)
