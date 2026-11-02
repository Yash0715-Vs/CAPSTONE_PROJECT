"""
Pytest configuration and test database isolation.

Meets Pre-Day 3 Technical Requirement 1:
- Uses a dedicated test database (SQLite: test_it_asset.db).
- Overrides FastAPI's `get_db` dependency during automated tests.
- Redirects `db_manager._session_factory` to the test database so all direct session usages use the test DB.
- Completely isolates all test executions from the demonstration MySQL database.
- Never deletes or modifies legitimate demonstration MySQL records based on ticket titles or patterns.
- Guarantees demonstration MySQL records remain 100% unchanged across repeated test runs.
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database.connection import db_manager, get_db
from app.models.db_models import (
    Base,
    UserDB,
    AssetDB,
    AssetAssignmentDB,
    TicketDB,
    TicketHistoryDB,
    ActivityLogDB,
    EquipmentRequestDB,
)

TEST_DB_URL = "sqlite:///test_it_asset.db"

# Dedicated SQLite test engine
test_engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    """FastAPI dependency override yielding sessions bound to the test database."""
    session = TestSessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Session fixture:
    1. Initializes isolated SQLite test database tables.
    2. Clones the baseline dataset into SQLite once for realistic test execution.
    3. Overrides FastAPI `get_db` and `db_manager._session_factory` to point to test_engine.
    4. Restores original configuration on session completion.
    """
    # 1. Reset and initialize SQLite schema
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)

    # 2. Clone demonstration baseline into the test database
    orig_factory = db_manager._session_factory
    test_session = TestSessionLocal()

    try:
        with orig_factory() as live_session:
            for model in [UserDB, AssetDB, AssetAssignmentDB, TicketDB, TicketHistoryDB, ActivityLogDB, EquipmentRequestDB]:
                rows = live_session.query(model).all()
                for row in rows:
                    live_session.expunge(row)
                    test_session.merge(row)
                test_session.flush()
            test_session.commit()
    except Exception as err:
        test_session.rollback()
        print(f"[conftest warning] Could not clone demonstration data to SQLite: {err}")
    finally:
        test_session.close()

    # 3. Apply isolation overrides
    db_manager._session_factory = TestSessionLocal
    app.dependency_overrides[get_db] = override_get_db

    yield

    # 4. Teardown: Clean up overrides
    app.dependency_overrides.pop(get_db, None)
    db_manager._session_factory = orig_factory
