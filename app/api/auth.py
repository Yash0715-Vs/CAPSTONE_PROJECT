"""
Authentication API Endpoints.

Meets Capstone Specification Section 12:
- POST /auth/register
- POST /auth/login
- GET  /auth/me
- POST /auth/logout
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import UserRepository, ActivityLogRepository
from app.models.db_models import UserDB
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth_service import AuthService, get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, session: Session = Depends(get_db)):
    """Registers a new employee or user account."""
    if UserRepository.get_by_user_id(session, user_in.user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User ID '{user_in.user_id}' is already registered."
        )
    if UserRepository.get_by_email(session, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Email '{user_in.email}' is already registered."
        )

    hashed_pw = AuthService.hash_password(user_in.password)
    new_user = UserDB(
        user_id=user_in.user_id,
        name=user_in.name,
        email=user_in.email,
        hashed_password=hashed_pw,
        role=user_in.role.upper(),
        department=user_in.department,
    )
    saved_user = UserRepository.create(session, new_user)
    ActivityLogRepository.log(session, "USER_REGISTERED", saved_user.user_id, f"Registered role {saved_user.role}")
    return saved_user


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, session: Session = Depends(get_db)):
    """Authenticates user credentials and returns a JWT access token."""
    user = UserRepository.get_by_user_id(session, credentials.user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid User ID or password.")

    # Check password (also support default placeholder for seeded accounts)
    is_valid = AuthService.verify_password(credentials.password, user.hashed_password)
    if not is_valid and user.hashed_password == "hashed_placeholder_pw":
        # Allow initial dev login for seeded users if using standard initial password
        if credentials.password in ("root", "admin123", "password"):
            is_valid = True

    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid User ID or password.")

    token = AuthService.create_access_token(
        data={"sub": user.user_id, "role": user.role, "name": user.name}
    )
    ActivityLogRepository.log(session, "USER_LOGIN", user.user_id, "User logged in successfully")
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: UserDB = Depends(get_current_user)):
    """Returns the authenticated user's profile details."""
    return current_user


@router.post("/logout")
def logout(current_user: UserDB = Depends(get_current_user), session: Session = Depends(get_db)):
    """Logs out the current session."""
    ActivityLogRepository.log(session, "USER_LOGOUT", current_user.user_id, "User logged out")
    return {"message": f"User {current_user.user_id} logged out successfully."}
