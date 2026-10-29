"""
Phase 1 & 2 Unit Tests: Authentication, Account Lifecycle, and Registration Security.

Validates:
- Valid login succeeds with JWT.
- Invalid login fails (wrong password, non-existent user).
- Pending and disabled users cannot log in.
- Placeholder password bypass ('hashed_placeholder_pw') is eliminated.
- Public registration endpoint rejects unauthorized account/role creation.
- Admin-created pending employee accounts generate secure invitation tokens.
- Verifying valid, invalid, and expired invitations.
- Completing registration with secure password activates account.
- Single-use invitation token invalidation (cannot reuse token).
- Duplicate user IDs and emails are strictly rejected.
"""

from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.auth_service import AuthService
from app.models.db_models import UserDB, UserStatus, UserRole
from app.database.connection import db_manager

client = TestClient(app)


@pytest.fixture(scope="module")
def admin_token():
    """Authenticates as seeded administrator ADM-001."""
    res = client.post("/auth/login", json={"user_id": "ADM-001", "password": "password"})
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    return res.json()["access_token"]


def test_login_success():
    """Valid login produces a valid JWT and user object without password hash."""
    res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "password"})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["user_id"] == "EMP-101"
    assert data["user"]["status"] == "ACTIVE"
    assert "hashed_password" not in data["user"]


def test_login_invalid_password():
    """Invalid credentials return 401."""
    res = client.post("/auth/login", json={"user_id": "EMP-101", "password": "incorrect_password_xyz"})
    assert res.status_code == 401
    assert "Invalid" in res.json()["detail"]


def test_login_nonexistent_user():
    """Nonexistent user returns 401."""
    res = client.post("/auth/login", json={"user_id": "NON_EXISTENT_999", "password": "password"})
    assert res.status_code == 401
    assert "Invalid" in res.json()["detail"]


def cleanup_test_user(user_id: str):
    """Helper to cleanly remove transient test users."""
    with db_manager.get_session() as session:
        u = session.query(UserDB).filter(UserDB.user_id == user_id).first()
        if u:
            session.delete(u)


def test_placeholder_password_bypass_eliminated():
    """
    Ensure the previous bypass (allowing 'root', 'admin123', 'password'
    when hashed_password equals 'hashed_placeholder_pw') is completely removed.
    """
    test_id = "BYPASS-TEST-01"
    cleanup_test_user(test_id)
    with db_manager.get_session() as session:
        test_user = UserDB(
            user_id=test_id,
            name="Bypass Probe",
            email="bypass.probe@company.com",
            hashed_password="hashed_placeholder_pw",
            role=UserRole.EMPLOYEE.value,
            status=UserStatus.ACTIVE.value,
        )
        session.add(test_user)

    for pwd in ["root", "admin123", "password"]:
        res = client.post("/auth/login", json={"user_id": test_id, "password": pwd})
        assert res.status_code == 401, f"Bypass succeeded for password '{pwd}'!"

    cleanup_test_user(test_id)



def test_public_registration_disabled():
    """Public registration cannot create arbitrary users or assign privileged roles."""
    res = client.post(
        "/auth/register",
        json={
            "user_id": "ROGUE-01",
            "name": "Rogue Admin",
            "email": "rogue@evil.com",
            "password": "Password123!",
            "role": "ADMIN"
        }
    )
    assert res.status_code == 403
    assert "disabled" in res.json()["detail"].lower()


def test_admin_employee_creation_and_invitation_lifecycle(admin_token):
    """
    Tests complete employee registration workflow:
    1. Admin creates employee account -> Account placed in PENDING state.
    2. Secure single-use invitation token is issued.
    3. Employee verifies invitation token.
    4. Employee attempts login before activation -> Rejected.
    5. Employee completes registration and sets password -> Account becomes ACTIVE.
    6. Reused token is rejected.
    7. Employee can now log in with new credentials.
    """
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    test_emp_id = "EMP-TEST-901"
    test_email = "test.employee.901@company.com"
    cleanup_test_user(test_emp_id)

    try:
        # Step 1: Admin creates pending employee
        create_res = client.post(
            "/users",
            json={
                "user_id": test_emp_id,
                "name": "Arun Kumar",
                "email": test_email,
                "role": "EMPLOYEE",
                "department": "Engineering"
            },
            headers=admin_headers
        )
        assert create_res.status_code == 201, f"Create user failed: {create_res.text}"
        create_data = create_res.json()
        assert create_data["status"] == "PENDING"
        assert create_data["invitation_token"] is not None
        invitation_token = create_data["invitation_token"]

        # Step 2: Employee attempts login while PENDING -> Must be rejected with 403
        early_login = client.post("/auth/login", json={"user_id": test_emp_id, "password": "AnyPassword123!"})
        assert early_login.status_code == 403
        assert "pending activation" in early_login.json()["detail"].lower()

        # Step 3: Verify valid invitation token
        verify_res = client.get(f"/auth/verify-invitation?token={invitation_token}")
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["valid"] is True
        assert verify_data["user_id"] == test_emp_id
        assert verify_data["name"] == "Arun Kumar"

        # Step 4: Complete registration with new password
        complete_res = client.post(
            "/auth/complete-registration",
            json={
                "invitation_token": invitation_token,
                "password": "SecurePassword#2026"
            }
        )
        assert complete_res.status_code == 200
        assert complete_res.json()["status"] == "ACTIVE"

        # Step 5: Invitation token cannot be reused
        reuse_res = client.post(
            "/auth/complete-registration",
            json={
                "invitation_token": invitation_token,
                "password": "AnotherPassword#2026"
            }
        )
        assert reuse_res.status_code == 400
        assert "Invalid, already used" in reuse_res.json()["detail"]

        # Step 6: Employee logs in with new password
        login_res = client.post(
            "/auth/login",
            json={"user_id": test_emp_id, "password": "SecurePassword#2026"}
        )
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()
        assert login_res.json()["user"]["status"] == "ACTIVE"
    finally:
        cleanup_test_user(test_emp_id)


def test_expired_invitation_rejected(admin_token):
    """Expired invitation tokens are rejected."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    expired_emp_id = "EMP-EXP-902"
    expired_email = "expired.invitation@company.com"
    cleanup_test_user(expired_emp_id)

    try:
        create_res = client.post(
            "/users",
            json={
                "user_id": expired_emp_id,
                "name": "Expired Account",
                "email": expired_email,
                "role": "EMPLOYEE",
            },
            headers=admin_headers
        )
        assert create_res.status_code == 201
        token = create_res.json()["invitation_token"]

        # Manually expire the invitation token in the database
        with db_manager.get_session() as session:
            user = session.query(UserDB).filter(UserDB.user_id == expired_emp_id).first()
            user.invitation_expires_at = datetime.now(timezone.utc) - timedelta(hours=1)

        verify_res = client.get(f"/auth/verify-invitation?token={token}")
        assert verify_res.status_code == 400
        assert "expired" in verify_res.json()["detail"].lower()

        complete_res = client.post(
            "/auth/complete-registration",
            json={"invitation_token": token, "password": "ValidPassword#123"}
        )
        assert complete_res.status_code == 400
        assert "expired" in complete_res.json()["detail"].lower()
    finally:
        cleanup_test_user(expired_emp_id)


def test_disabled_user_login_rejected(admin_token):
    """Disabled accounts cannot log in."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    dis_id = "EMP-DIS-903"
    dis_email = "disabled.user@company.com"
    cleanup_test_user(dis_id)

    try:
        # Create active user
        create_res = client.post(
            "/users",
            json={
                "user_id": dis_id,
                "name": "Disabled Person",
                "email": dis_email,
                "role": "EMPLOYEE",
                "password": "InitialPassword#123"
            },
            headers=admin_headers
        )
        assert create_res.status_code == 201

        # Disable the user
        update_res = client.put(
            f"/users/{dis_id}",
            json={"status": "DISABLED"},
            headers=admin_headers
        )
        assert update_res.status_code == 200
        assert update_res.json()["status"] == "DISABLED"

        # Attempt login
        login_res = client.post("/auth/login", json={"user_id": dis_id, "password": "InitialPassword#123"})
        assert login_res.status_code == 403
        assert "disabled" in login_res.json()["detail"].lower()
    finally:
        cleanup_test_user(dis_id)


def test_duplicate_user_id_and_email_rejected(admin_token):
    """System rejects duplicate user IDs and emails."""
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    cleanup_test_user("EMP-NEW-999")

    # Duplicate user_id
    dup_id_res = client.post(
        "/users",
        json={
            "user_id": "EMP-101",
            "name": "Clone User",
            "email": "unique.email.123@company.com",
            "role": "EMPLOYEE"
        },
        headers=admin_headers
    )
    assert dup_id_res.status_code == 400
    assert "already exists" in dup_id_res.json()["detail"].lower()

    # Get EMP-101's actual email from DB
    with db_manager.get_session() as session:
        emp101 = session.query(UserDB).filter(UserDB.user_id == "EMP-101").first()
        emp_email = emp101.email

    # Duplicate email
    dup_email_res = client.post(
        "/users",
        json={
            "user_id": "EMP-NEW-999",
            "name": "Clone Email",
            "email": emp_email,
            "role": "EMPLOYEE"
        },
        headers=admin_headers
    )
    assert dup_email_res.status_code == 400
    assert "already exists" in dup_email_res.json()["detail"].lower()

