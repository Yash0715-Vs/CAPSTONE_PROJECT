"""
Secure Initial Administrator Bootstrap CLI Utility.

Meets Capstone Backend Handover & Security Requirements:
- Interactively or programmatically bootstraps the initial Administrator account
- Prompts for secure password via getpass (or reads from ADMIN_BOOTSTRAP_PASSWORD env)
- Validates password length (minimum 8 characters)
- Hashes password using bcrypt with random salt
- Creates or updates account in ACTIVE status with role ADMIN
- Contains NO hardcoded default credentials or backdoors
- Logs the administrative event in ActivityLogDB
"""

import sys
import os
import argparse
import getpass
from pathlib import Path

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.database.connection import db_manager
from app.models.db_models import UserDB, UserStatus, UserRole
from app.database.repositories import UserRepository, ActivityLogRepository
from app.services.auth_service import AuthService


def bootstrap_admin(
    user_id: str,
    name: str,
    email: str,
    department: str = "IT Administration",
    password: str = None
) -> None:
    print("=" * 65)
    print("SECURE ADMINISTRATOR BOOTSTRAP UTILITY")
    print("=" * 65)

    # 1. Resolve password
    if not password:
        password = os.getenv("ADMIN_BOOTSTRAP_PASSWORD")

    if not password:
        print(f"\nConfiguring Administrator Account '{user_id}' ({email})")
        while True:
            pwd1 = getpass.getpass("Enter Admin Password (min 8 characters): ")
            if len(pwd1.strip()) < 8:
                print("[-] Error: Password must be at least 8 characters long.")
                continue
            pwd2 = getpass.getpass("Confirm Admin Password: ")
            if pwd1 != pwd2:
                print("[-] Error: Passwords do not match. Please try again.")
                continue
            password = pwd1
            break
    else:
        if len(password.strip()) < 8:
            print("[-] Error: Provided password must be at least 8 characters long.")
            sys.exit(1)

    # 2. Hash password securely
    hashed_pw = AuthService.hash_password(password)

    # 3. Save to database
    with db_manager.get_session() as session:
        existing_user = UserRepository.get_by_user_id(session, user_id)
        if existing_user:
            print(f"[!] User ID '{user_id}' already exists in database.")
            existing_user.name = name
            existing_user.email = email
            existing_user.role = UserRole.ADMIN.value
            existing_user.status = UserStatus.ACTIVE.value
            existing_user.hashed_password = hashed_pw
            existing_user.department = department
            existing_user.invitation_token_hash = None
            existing_user.invitation_expires_at = None
            action = "ADMIN_BOOTSTRAP_UPDATED"
            print(f"[+] Successfully updated existing user '{user_id}' to ACTIVE ADMIN role.")
        else:
            new_admin = UserDB(
                user_id=user_id,
                name=name,
                email=email,
                hashed_password=hashed_pw,
                role=UserRole.ADMIN.value,
                status=UserStatus.ACTIVE.value,
                department=department,
            )
            UserRepository.create(session, new_admin)
            action = "ADMIN_BOOTSTRAP_CREATED"
            print(f"[+] Successfully created new Administrator '{user_id}'.")

        ActivityLogRepository.log(
            session=session,
            action=action,
            user_id=user_id,
            details=f"Admin account bootstrapped securely with ACTIVE status"
        )

    print("\n[SUCCESS] Administrator bootstrap completed successfully!")
    print(f"  User ID:    {user_id}")
    print(f"  Name:       {name}")
    print(f"  Email:      {email}")
    print(f"  Role:       ADMIN")
    print(f"  Status:     ACTIVE")
    print("=" * 65)


def main():
    parser = argparse.ArgumentParser(description="Bootstrap Initial Administrator Account")
    parser.add_argument("--user-id", default="ADM-001", help="Administrator User ID (default: ADM-001)")
    parser.add_argument("--name", default="System Administrator", help="Admin Full Name")
    parser.add_argument("--email", default="admin@company.com", help="Admin Email Address")
    parser.add_argument("--department", default="IT Administration", help="Admin Department")
    parser.add_argument("--password", default=None, help="Admin Password (optional, will prompt securely if omitted)")

    args = parser.parse_args()
    bootstrap_admin(
        user_id=args.user_id,
        name=args.name,
        email=args.email,
        department=args.department,
        password=args.password
    )


if __name__ == "__main__":
    main()
