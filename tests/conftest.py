"""
Pytest configuration and isolation fixtures.
Ensures automated tests do not pollute or inflate the demonstration MySQL database.
"""

import pytest
from app.database.connection import get_db
from app.models.db_models import TicketDB, TicketHistoryDB, AssetDB

TEST_TICKET_TITLES = {
    "EMP-101 Secret Ticket",
    "EMP-101 Close Test",
    "Still Open Ticket",
    "Assign Check",
    "VPN connection drops",
    "WiFi disconnected on 3rd floor",
    "EMP-101 WS Test",
    "Test Ticket Title",
    "Unique Title For Auto Classify"
}

@pytest.fixture(autouse=True)
def isolate_test_database_records():
    """
    Teardown hook: Automatically removes newly created test tickets and assets
    created during integration test executions, preserving the demonstration dataset.
    """
    yield
    try:
        session = next(get_db())
        # Find test-generated tickets created during tests
        test_tickets = session.query(TicketDB).filter(
            (TicketDB.title.in_(TEST_TICKET_TITLES)) |
            (TicketDB.ticket_id.startswith("TEST-")) |
            (TicketDB.ticket_id.startswith("ISO-"))
        ).all()
        
        # Only clean up test tickets created beyond the baseline seed
        # Notice: seeded tickets start from INC-1001 to INC-1055.
        # Any test tickets with ID >= INC-1290 matching test titles are isolated test artifacts.
        for t in test_tickets:
            # Only remove if ticket_id is TEST-* or was created in recent test runs (e.g. >= INC-1294)
            if t.ticket_id.startswith("TEST-") or t.ticket_id.startswith("ISO-") or (
                t.ticket_id.startswith("INC-") and int(t.ticket_id.split("-")[1]) >= 1294
            ):
                session.query(TicketHistoryDB).filter(TicketHistoryDB.ticket_id == t.ticket_id).delete()
                session.delete(t)

        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()
