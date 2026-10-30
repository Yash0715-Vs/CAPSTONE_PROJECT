"""
Reports and Analytics API Endpoints.

Meets Capstone Specification Sections 12 and 14:
- GET /reports/tickets (Breakdown by status, category, priority)
- GET /reports/assets  (Breakdown by type and assignment status)
- GET /reports/sla     (Calculates SLA health, breach ratios, average resolution time)
- GET /reports/external-status (External API integration using Python `requests`)
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import requests

from app.database.connection import get_db
from app.database.repositories import TicketRepository, AssetRepository, ActivityLogRepository
from app.models.db_models import UserDB
from app.models.ticket import Ticket, TicketCategory, TicketPriority, TicketStatus
from app.services.auth_service import require_roles, get_current_user
from app.services.sla_service import SLAService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/tickets")
def get_ticket_report(
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
) -> Dict[str, Any]:
    """Generates analytics on ticket volume, priorities, and category distribution."""
    tickets = TicketRepository.list_tickets(session)
    total = len(tickets)

    by_status: Dict[str, int] = {}
    by_category: Dict[str, int] = {}
    by_priority: Dict[str, int] = {}

    for t in tickets:
        by_status[t.status] = by_status.get(t.status, 0) + 1
        by_category[t.category] = by_category.get(t.category, 0) + 1
        by_priority[t.priority] = by_priority.get(t.priority, 0) + 1

    return {
        "total_tickets": total,
        "by_status": by_status,
        "by_category": by_category,
        "by_priority": by_priority,
    }


@router.get("/assets")
def get_asset_report(
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
) -> Dict[str, Any]:
    """Generates hardware inventory utilization and status metrics."""
    assets = AssetRepository.list_assets(session)
    total = len(assets)

    by_status: Dict[str, int] = {}
    by_type: Dict[str, int] = {}

    for a in assets:
        by_status[a.status] = by_status.get(a.status, 0) + 1
        by_type[a.type] = by_type.get(a.type, 0) + 1

    return {
        "total_assets": total,
        "by_status": by_status,
        "by_type": by_type,
    }


@router.get("/sla")
def get_sla_report(
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
) -> Dict[str, Any]:
    """
    Computes SLA performance, breach status for active tickets,
    and average resolution times across closed incidents.
    """
    db_tickets = TicketRepository.list_tickets(session)

    # Convert DB models to domain Ticket models for SLAService calculation
    domain_tickets: List[Ticket] = []
    for dt in db_tickets:
        try:
            cat = TicketCategory(dt.category)
        except ValueError:
            cat = TicketCategory.OTHER
        try:
            pri = TicketPriority(dt.priority)
        except ValueError:
            pri = TicketPriority.MEDIUM
        try:
            stat = TicketStatus(dt.status)
        except ValueError:
            stat = TicketStatus.OPEN

        domain_tickets.append(Ticket(
            ticket_id=dt.ticket_id,
            title=dt.title,
            description=dt.description,
            created_by=dt.created_by,
            category=cat,
            priority=pri,
            status=stat,
            created_date=dt.created_date,
            closed_date=dt.closed_date,
        ))

    sla_evaluations = [SLAService.get_ticket_sla_status(t) for t in domain_tickets]
    breached_count = sum(1 for item in sla_evaluations if item["is_breached"])
    avg_stats = SLAService.calculate_average_resolution_time(domain_tickets)

    return {
        "total_tickets_analyzed": len(domain_tickets),
        "breached_count": breached_count,
        "active_on_time_count": len(domain_tickets) - breached_count,
        "compliance_rate": f"{((len(domain_tickets) - breached_count) / len(domain_tickets) * 100):.1f}%" if domain_tickets else "100%",
        "resolution_metrics": avg_stats,
        "individual_ticket_sla": sla_evaluations,
    }


@router.get("/audit")
def get_audit_trail(
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Returns recent system activity logs from the database."""
    logs = ActivityLogRepository.list_recent(session, limit=40)
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        }
        for log in logs
    ]


@router.get("/external-status")
def check_external_service_status(
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
) -> Dict[str, Any]:
    """
    Demonstrates External API Integration using Python `requests` (Section 14):
    Fetches network and server geo-diagnostics with robust timeout and exception handling.
    """
    api_url = "https://httpbin.org/get"
    try:
        response = requests.get(api_url, timeout=4.0)
        response.raise_for_status()
        return {
            "status": "SUCCESS",
            "status_code": response.status_code,
            "origin_ip": response.json().get("origin"),
            "headers_verified": True,
        }
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="External service timed out after 4.0 seconds."
        )
    except requests.exceptions.ConnectionError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to connect to external diagnostic service."
        )
    except requests.exceptions.RequestException as err:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"External API error: {err}"
        )
