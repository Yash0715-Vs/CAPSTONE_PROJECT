"""
Database Connection Manager (Singleton Pattern).

Meets Capstone Specification Section 29.1 (Design Patterns - Singleton):
- Implements the SINGLETON pattern for centralized Database Engine & Session management
- Provides a clean context manager and generator for database sessions
- Supports MySQL (via PyMySQL for DBeaver inspection), PostgreSQL, and SQLite
"""

import sys
import logging
from pathlib import Path
from typing import Generator, Optional
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.exc import OperationalError

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import config
from app.models.db_models import Base
from app.utils.exceptions import DatabaseConnectionError

logger = logging.getLogger("app.database")


class DatabaseConnectionManager:
    """
    SINGLETON Database Connection Manager.
    Guarantees only a single shared SQLAlchemy Engine and Sessionmaker exist.
    """
    _instance: Optional["DatabaseConnectionManager"] = None

    def __new__(cls) -> "DatabaseConnectionManager":
        if cls._instance is None:
            cls._instance = super(DatabaseConnectionManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return

        self.db_url = config.get_database_url()
        self._engine = None
        self._session_factory = None
        self._setup_engine()
        self._initialized = True

    def _setup_engine(self):
        """Initializes SQLAlchemy Engine with connection pool parameters."""
        try:
            # Pool parameters suitable for MySQL / Relational DBs
            connect_args = {}
            if "sqlite" in self.db_url:
                connect_args["check_same_thread"] = False

            self._engine = create_engine(
                self.db_url,
                pool_pre_ping=True,  # Automatically detects and discards stale connections
                pool_recycle=3600,   # Recycle connections hourly (avoids MySQL 'MySQL server has gone away')
                connect_args=connect_args,
                echo=False           # Set to True if detailed SQL queries are desired
            )
            self._session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self._engine
            )
        except Exception as err:
            raise DatabaseConnectionError(f"Failed to create database engine: {err}")

    @property
    def engine(self):
        return self._engine

    @property
    def session_factory(self):
        return self._session_factory

    def test_connection(self) -> bool:
        """
        Executes a test ping query to verify connectivity.
        """
        try:
            with self._engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except OperationalError as err:
            logger.warning("Database connection attempt failed: %s", err)
            return False

    def init_tables(self) -> None:
        """
        Creates all defined database tables (Base.metadata.create_all).
        Tables will immediately be visible inside DBeaver.
        """
        try:
            Base.metadata.create_all(bind=self._engine)
        except Exception as err:
            raise DatabaseConnectionError(f"Failed to initialize database tables: {err}")

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """
        Context manager for database transactions.
        Automatically commits on success and rolls back on exception (ACID Atomicity).
        """
        session: Session = self._session_factory()
        try:
            yield session
            session.commit()
        except Exception as err:
            session.rollback()
            raise err
        finally:
            session.close()


# Singleton instance accessor
db_manager = DatabaseConnectionManager()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency-compatible session generator.
    Yields session and guarantees closure.
    """
    session = db_manager.session_factory()
    try:
        yield session
    finally:
        session.close()


if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING DATABASE SINGLETON CONNECTION DEMO")
    print("=" * 65)

    # 1. Verify Singleton Property
    manager1 = DatabaseConnectionManager()
    manager2 = DatabaseConnectionManager()
    print("\n[1] Verifying Singleton Pattern:")
    print(f"  manager1 id: {id(manager1)}")
    print(f"  manager2 id: {id(manager2)}")
    print(f"  Same instance? {manager1 is manager2} (SINGLETON VERIFIED)")

    # 2. Test Connection
    print(f"\n[2] Testing Database Connectivity ({db_manager.db_url.split('@')[-1] if '@' in db_manager.db_url else db_manager.db_url}):")
    is_connected = db_manager.test_connection()
    if is_connected:
        print("  [SUCCESS] Connected to database successfully!")
        print("  Initializing tables for DBeaver inspection...")
        db_manager.init_tables()
        print("  All tables created successfully!")
    else:
        print("  [NOTE] Could not connect to external MySQL instance.")
        print("  Please check that MySQL service is running and credentials in .env are correct.")
        print("  (Tip: Configure DB_USER, DB_PASSWORD, DB_NAME in .env)")

    print("\n" + "=" * 65)
    print("DATABASE CONNECTION TESTS FINISHED!")
    print("=" * 65)
