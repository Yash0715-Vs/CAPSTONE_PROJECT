"""
Database Seeder Script for MySQL / Relational Database.

Ingests records from data/employees.txt, data/assets.txt, and data/tickets.txt
using FileHandler and populates the MySQL database tables.
Populates 50+ Indian employees, 60 hardware assets, and 55 enterprise support tickets.
Allows immediate inspection inside DBeaver!
"""

import sys
import os
from pathlib import Path
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database.connection import db_manager
from app.database.repositories import UserRepository, AssetRepository, TicketRepository, ActivityLogRepository
from app.models.db_models import (
    UserDB,
    AssetDB,
    AssetAssignmentDB,
    TicketDB,
    TicketHistoryDB,
    ActivityLogDB,
)
from app.services.auth_service import AuthService
from app.utils.file_handler import FileHandler


def _clean_tables(session: Session) -> None:
    """Safely clears existing records in foreign key dependency order."""
    session.query(TicketHistoryDB).delete()
    session.query(TicketDB).delete()
    session.query(AssetAssignmentDB).delete()
    session.query(AssetDB).delete()
    session.query(ActivityLogDB).delete()
    session.query(UserDB).delete()
    session.flush()


def _seed_users(session: Session, emp_file: str, default_password_hash: str) -> int:
    """Seeds Indian employee records into the users table."""
    if not os.path.exists(emp_file):
        return 0
    records = FileHandler.parse_delimited_records(emp_file, delimiter="|")
    for r in records:
        user = UserDB(
            user_id=r["employee_id"],
            name=r["name"],
            email=r["email"],
            hashed_password=default_password_hash,
            role=r["role"],
            department=r.get("department", "General"),
            created_at=datetime.now(timezone.utc)
        )
        UserRepository.create(session, user)
    return len(records)


def _seed_assets(session: Session, asset_file: str) -> int:
    """Seeds hardware assets into the assets table."""
    if not os.path.exists(asset_file):
        return 0
    records = FileHandler.parse_delimited_records(asset_file, delimiter="|")
    for r in records:
        assigned_to = r.get("assigned_to", "").strip() or None
        asset = AssetDB(
            asset_id=r["asset_id"],
            type=r["type"],
            brand=r["brand"],
            model=r["model"],
            serial_number=r["serial_number"],
            status=r.get("status", "AVAILABLE"),
            assigned_to=assigned_to,
            purchase_date=date.today(),
            specs_json='{"ram_gb": 16, "processor": "Intel/Apple Silicon", "storage_gb": 512}'
        )
        AssetRepository.create(session, asset)
    return len(records)


def _seed_tickets(session: Session, ticket_file: str) -> int:
    """Seeds support tickets into the tickets table."""
    if not os.path.exists(ticket_file):
        return 0
    records = FileHandler.parse_delimited_records(ticket_file, delimiter="|")
    for r in records:
        assigned_to = r.get("assigned_to", "").strip() or None
        ticket = TicketDB(
            ticket_id=r["ticket_id"],
            title=r["title"],
            description=f"Automated enterprise ticket: {r['title']}",
            category=r.get("category", "Other"),
            priority=r.get("priority", "MEDIUM"),
            status=r.get("status", "OPEN"),
            created_by=r["created_by"],
            assigned_to=assigned_to,
            created_date=datetime.now(timezone.utc),
        )
        TicketRepository.create(session, ticket)
    return len(records)


def seed_database(clean: bool = True):
    """Seeds MySQL database with realistic Indian employee records, assets, and tickets."""
    print("=" * 65)
    print("SEEDING MYSQL DATABASE (it_asset_db) WITH 100+ SAMPLE RECORDS")
    print("=" * 65)

    data_dir = os.path.join(ROOT_DIR, "data")
    emp_file = os.path.join(data_dir, "employees.txt")
    asset_file = os.path.join(data_dir, "assets.txt")
    ticket_file = os.path.join(data_dir, "tickets.txt")

    print("\n[1] Initializing Database Schema...")
    db_manager.init_tables()
    print("  -> Tables verified successfully in MySQL.")

    default_hashed_pw = AuthService.hash_password("password")

    with db_manager.get_session() as session:
        if clean:
            print("\n[2] Cleaning previous demo data...")
            _clean_tables(session)
            print("  -> Previous tables cleared successfully.")

        print("\n[3] Seeding 50 Indian Users from data/employees.txt...")
        users_count = _seed_users(session, emp_file, default_hashed_pw)
        print(f"  -> Added {users_count} Indian users to 'users' table.")

        print("\n[4] Seeding 60 Hardware Assets from data/assets.txt...")
        assets_count = _seed_assets(session, asset_file)
        print(f"  -> Added {assets_count} IT assets to 'assets' table.")

        print("\n[5] Seeding 55 Support Tickets from data/tickets.txt...")
        tickets_count = _seed_tickets(session, ticket_file)
        print(f"  -> Added {tickets_count} tickets to 'tickets' table.")

        ActivityLogRepository.log(
            session=session,
            action="DATABASE_SEED",
            user_id="ADM-001",
            details=f"Seeded {users_count} users, {assets_count} assets, and {tickets_count} tickets."
        )

    print("\n" + "=" * 65)
    print(f"MYSQL DATABASE SEEDING COMPLETE! Total records: {users_count + assets_count + tickets_count}")
    print("All records are immediately inspectable in DBeaver under 'it_asset_db'!")
    print("Default password for all seeded accounts is: 'password'")
    print("=" * 65)


if __name__ == "__main__":
    seed_database()
