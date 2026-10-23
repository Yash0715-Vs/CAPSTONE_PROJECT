"""
Users API Endpoints.

Meets Capstone Specification Section 12:
- GET    /users
- GET    /users/{user_id}
- POST   /users
- PUT    /users/{user_id}
- DELETE /users/{user_id}
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import UserRepository, ActivityLogRepository
from app.models.db_models import UserDB
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.auth_service import AuthService, get_current_user, require_roles

router = APIRouter(prefix="/users", tags=["Users"])


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
    if current_user.role != "ADMIN" and current_user.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to view your own profile."
        )

    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")
    return user


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: UserCreate,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin-only endpoint to register a new user or administrator."""
    if UserRepository.get_by_user_id(session, user_in.user_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"User ID '{user_in.user_id}' exists.")
    if UserRepository.get_by_email(session, user_in.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Email '{user_in.email}' exists.")

    hashed_pw = AuthService.hash_password(user_in.password)
    user = UserDB(
        user_id=user_in.user_id,
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role=user_in.role.upper(),
        department=user_in.department,
    )
    saved = UserRepository.create(session, user)
    ActivityLogRepository.log(session, "ADMIN_CREATE_USER", admin.user_id, f"Created user {saved.user_id}")
    return saved


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    update_in: UserUpdate,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin-only endpoint to update user roles and department."""
    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    if update_in.name is not None:
        user.name = update_in.name
    if update_in.email is not None:
        user.email = update_in.email
    if update_in.role is not None:
        user.role = update_in.role.upper()
    if update_in.department is not None:
        user.department = update_in.department
    if update_in.password:
        user.hashed_password = AuthService.hash_password(update_in.password)

    session.flush()
    ActivityLogRepository.log(session, "ADMIN_UPDATE_USER", admin.user_id, f"Updated user {user_id}")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
def delete_user(
    user_id: str,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin-only endpoint to remove a user."""
    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User '{user_id}' not found.")

    session.delete(user)
    session.flush()
    ActivityLogRepository.log(session, "ADMIN_DELETE_USER", admin.user_id, f"Deleted user {user_id}")
    return {"message": f"User '{user_id}' deleted successfully."}
