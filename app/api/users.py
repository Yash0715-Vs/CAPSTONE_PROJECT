"""
Users API Endpoints.

Meets Capstone Specification Section 12:
- GET    /users
- GET    /users/{user_id}
- POST   /users
- POST   /users/{user_id}/reinvite
- PUT    /users/{user_id}
- DELETE /users/{user_id}
"""

from typing import List
from datetime import datetime, timedelta, timezone
import secrets
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import UserRepository, ActivityLogRepository
from app.models.db_models import UserDB, UserStatus, UserRole
from app.schemas.user import UserCreate, UserCreateResponse, UserInviteRequest, UserUpdate, UserResponse
from app.services.auth_service import AuthService, get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])


@router.post("/invite", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def invite_user(
    invite_in: UserInviteRequest,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """
    Admin-only endpoint to invite an employee or staff member.
    Generates a unique user ID (e.g. EMP-XXXXX) if omitted, provisions the account
    in PENDING state, and generates a cryptographically secure single-use invitation token.
    """
    if UserRepository.get_by_email(session, invite_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{invite_in.email}' is already registered."
        )

    # Determine role value
    role_val = invite_in.role.value if hasattr(invite_in.role, "value") else str(invite_in.role).upper()
    if role_val not in [r.value for r in UserRole]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role_val}'. Allowed roles: {[r.value for r in UserRole]}"
        )

    # Determine or generate unique user_id
    user_id = invite_in.user_id
    if user_id:
        if UserRepository.get_by_user_id(session, user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User ID '{user_id}' already exists."
            )
    else:
        prefix = "IT" if role_val == UserRole.SUPPORT.value else ("ADM" if role_val == UserRole.ADMIN.value else "EMP")
        for _ in range(200):
            candidate = f"{prefix}-{secrets.randbelow(90000) + 10000}"
            if not UserRepository.get_by_user_id(session, candidate):
                user_id = candidate
                break
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not generate unique user ID."
            )

    invitation_token = AuthService.generate_invitation_token()
    token_hash = AuthService.hash_invitation_token(invitation_token)
    invitation_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    hashed_pw = AuthService.hash_password(secrets.token_hex(32))

    new_user = UserDB(
        user_id=user_id,
        name=invite_in.name,
        email=invite_in.email,
        hashed_password=hashed_pw,
        role=role_val,
        status=UserStatus.PENDING.value,
        invitation_token_hash=token_hash,
        invitation_expires_at=invitation_expires_at,
        department=invite_in.department or "General",
    )
    saved = UserRepository.create(session, new_user)
    ActivityLogRepository.log(
        session,
        "ADMIN_INVITE_USER",
        admin.user_id,
        f"Invited user {saved.user_id} ({saved.email}) with role {saved.role}"
    )

    response_dict = saved.to_dict()
    response_dict["invitation_token"] = invitation_token
    response_dict["invitation_expires_at"] = invitation_expires_at
    response_dict["message"] = "User invitation generated successfully."
    return UserCreateResponse(**response_dict)


@router.get("", response_model=List[UserResponse])
def list_users(
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Lists all registered employees and staff (Admin / Support only)."""
    return UserRepository.list_all(session)


@router.get("/{user_id}", response_model=UserResponse)
def get_user_by_id(
    user_id: str,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Retrieves specific user details. Employees can view their own profile."""
    if current_user.role != UserRole.ADMIN.value and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to view your own profile."
        )

    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")
    return user



@router.post("", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """
    Admin-only endpoint to create an employee or staff account.
    - If password is omitted, account is placed in PENDING state and an invitation token is generated.
    - If password is provided, account is created in ACTIVE state.
    - Strictly validates employee ID and email uniqueness.
    """
    if UserRepository.get_by_user_id(session, user_in.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User ID '{user_in.user_id}' already exists."
        )
    if UserRepository.get_by_email(session, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' already exists."
        )

    role_val = user_in.role.value if hasattr(user_in.role, "value") else str(user_in.role).upper()
    if role_val not in [r.value for r in UserRole]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{role_val}'. Allowed roles: {[r.value for r in UserRole]}"
        )

    # Secure employee invitation workflow
    # Newly provisioned accounts are placed in PENDING state with a single-use expiring invitation token
    account_status = UserStatus.PENDING.value
    invitation_token = AuthService.generate_invitation_token()
    token_hash = AuthService.hash_invitation_token(invitation_token)
    invitation_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)
    # Secure random unusable password until registration is completed
    hashed_pw = AuthService.hash_password(secrets.token_hex(32))

    new_user = UserDB(
        user_id=user_in.user_id,
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role=role_val,
        status=account_status,
        invitation_token_hash=token_hash,
        invitation_expires_at=invitation_expires_at,
        department=user_in.department,
    )
    saved = UserRepository.create(session, new_user)
    ActivityLogRepository.log(
        session,
        "ADMIN_CREATE_USER",
        admin.user_id,
        f"Created user {saved.user_id} with role {saved.role} and status {saved.status}"
    )

    response_dict = saved.to_dict()
    response_dict["invitation_token"] = invitation_token
    response_dict["invitation_expires_at"] = invitation_expires_at
    response_dict["message"] = (
        "User account created in PENDING state. Provide the invitation token to the employee."
        if invitation_token else "User account created and activated."
    )
    return UserCreateResponse(**response_dict)


@router.post("/{user_id}/reinvite", response_model=UserCreateResponse)
def reinvite_user(
    user_id: str,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin-only endpoint to re-generate an invitation token for a PENDING employee account."""
    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    if user.status != UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reinvite user '{user_id}' because account status is {user.status}."
        )

    invitation_token = AuthService.generate_invitation_token()
    token_hash = AuthService.hash_invitation_token(invitation_token)
    invitation_expires_at = datetime.now(timezone.utc) + timedelta(hours=48)

    user.invitation_token_hash = token_hash
    user.invitation_expires_at = invitation_expires_at
    session.flush()

    ActivityLogRepository.log(
        session,
        "ADMIN_REINVITE_USER",
        admin.user_id,
        f"Re-issued registration invitation for {user_id}"
    )

    response_dict = user.to_dict()
    response_dict["invitation_token"] = invitation_token
    response_dict["invitation_expires_at"] = invitation_expires_at
    response_dict["message"] = "New invitation token generated."
    return UserCreateResponse(**response_dict)


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    update_in: UserUpdate,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin-only endpoint to update user attributes, roles, and status."""
    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    if update_in.email is not None and update_in.email != user.email:
        existing_email = UserRepository.get_by_email(session, update_in.email)
        if existing_email and existing_email.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Email '{update_in.email}' is already in use by another user."
            )
        user.email = update_in.email

    if update_in.name is not None:
        user.name = update_in.name

    if update_in.role is not None:
        role_val = update_in.role.value if hasattr(update_in.role, "value") else str(update_in.role).upper()
        if role_val not in [r.value for r in UserRole]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role '{role_val}'. Allowed roles: {[r.value for r in UserRole]}"
            )
        user.role = role_val

    if update_in.status is not None:
        status_val = update_in.status.value if hasattr(update_in.status, "value") else str(update_in.status).upper()
        if status_val not in [s.value for s in UserStatus]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status '{status_val}'. Allowed statuses: {[s.value for s in UserStatus]}"
            )
        user.status = status_val

    if update_in.department is not None:
        user.department = update_in.department

    if update_in.password:
        user.hashed_password = AuthService.hash_password(update_in.password)

    session.flush()
    ActivityLogRepository.log(
        session,
        "ADMIN_UPDATE_USER",
        admin.user_id,
        f"Updated user {user_id}: role={user.role}, status={user.status}"
    )
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: str,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin-only endpoint to remove a user."""
    if user_id == admin.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot delete their own active account."
        )

    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    session.delete(user)
    session.flush()
    ActivityLogRepository.log(session, "ADMIN_DELETE_USER", admin.user_id, f"Deleted user {user_id}")
    return {"message": f"User '{user_id}' deleted successfully."}

