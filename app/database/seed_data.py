"""
Database Seeder Script.

Ingests records from data/employees.txt, data/assets.txt, and data/tickets.txt
using FileHandler and populates the MySQL / Relational Database tables.
Allows immediate inspection inside DBeaver!
"""

import sys
import os
from pathlib import Path
from datetime import datetime, date

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database.connection import db_manager
from app.database.repositories import UserRepository, AssetRepository, TicketRepository, ActivityLogRepository
from app.models.db_models import UserDB, AssetDB, TicketDB
from app.utils.file_handler import FileHandler


def seed_database():
    """Seeds database with initial data from data/*.txt files."""
    print("=" * 65)
    print("SEEDING DATABASE FOR DBEAVER / MYSQL")
    print("=" * 65)

    data_dir = os.path.join(ROOT_DIR, "data")
    emp_file = os.path.join(data_dir, "employees.txt")
    asset_file = os.path.join(data_dir, "assets.txt")
    ticket_file = os.path.join(data_dir, "tickets.txt")

    # 1. Initialize tables
    print("\n[1] Initializing Database Schema...")
    db_manager.init_tables()
    print("  -> Tables created successfully in database.")

    with db_manager.get_session() as session:
        # 2. Seed Users
        print("\n[2] Seeding Users from data/employees.txt...")
        if os.path.exists(emp_file):
            emp_records = FileHandler.parse_delimited_records(emp_file, delimiter="|")
            for r in emp_records:
                existing = UserRepository.get_by_user_id(session, r["employee_id"])
                if not existing:
                    user = UserDB(
                        user_id=r["employee_id"],
                        name=r["name"],
                        email=r["email"],
                        hashed_password="hashed_placeholder_pw",  # Will use bcrypt in Phase 5
                        role=r["role"],
                        department=r.get("department", "General"),
                    )
                    UserRepository.create(session, user)
                    print(f"  + Added User: {user.user_id} ({user.name} - {user.role})")
        else:
            print("  ! employees.txt not found, skipping user seed.")

        # 3. Seed Assets
        print("\n[3] Seeding Assets from data/assets.txt...")
        if os.path.exists(asset_file):
            asset_records = FileHandler.parse_delimited_records(asset_file, delimiter="|")
            for r in asset_records:
                existing = AssetRepository.get_by_asset_id(session, r["asset_id"])
                if not existing:
                    assigned_to = r.get("assigned_to") or None
                    asset = AssetDB(
                        asset_id=r["asset_id"],
                        type=r["type"],
                        brand=r["brand"],
                        model=r["model"],
                        serial_number=r["serial_number"],
                        status=r.get("status", "AVAILABLE"),
                        assigned_to=assigned_to if assigned_to else None,
                        purchase_date=date.today()
                    )
                    AssetRepository.create(session, asset)
                    print(f"  + Added Asset: {asset.asset_id} ({asset.brand} {asset.model} - {asset.status})")
        else:
            print("  ! assets.txt not found, skipping asset seed.")

        # 4. Seed Tickets
        print("\n[4] Seeding Tickets from data/tickets.txt...")
        if os.path.exists(ticket_file):
            ticket_records = FileHandler.parse_delimited_records(ticket_file, delimiter="|")
            for r in ticket_records:
                existing = TicketRepository.get_by_ticket_id(session, r["ticket_id"])
                if not existing:
                    assigned_to = r.get("assigned_to") or None
                    ticket = TicketDB(
                        ticket_id=r["ticket_id"],
                        title=r["title"],
                        description=f"Auto-imported support request: {r['title']}",
                        category=r.get("category", "Other"),
                        priority=r.get("priority", "MEDIUM"),
                        status=r.get("status", "OPEN"),
                        created_by=r["created_by"],
                        assigned_to=assigned_to if assigned_to else None,
                        created_date=datetime.utcnow(),
                    )
                    TicketRepository.create(session, ticket)
                    print(f"  + Added Ticket: {ticket.ticket_id} ({ticket.title} - {ticket.priority})")
        else:
            print("  ! tickets.txt not found, skipping ticket seed.")

        # 5. Log Activity
        ActivityLogRepository.log(
            session=session,
            action="DATABASE_SEED",
            user_id="SYSTEM",
            details="Database populated with initial assets, employees, and tickets."
        )

    print("\n" + "=" * 65)
    print("DATABASE SEEDING COMPLETE! You can view the tables in DBeaver.")
    print("=" * 65)


if __name__ == "__main__":
    seed_database()
