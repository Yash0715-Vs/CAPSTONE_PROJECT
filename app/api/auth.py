"""
Authentication API Endpoints.

Meets Capstone Specification Section 12:
- POST /auth/register
- POST /auth/login
- GET  /auth/me
- POST /auth/logout
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import UserRepository, ActivityLogRepository
from app.models.db_models import UserDB, UserStatus
from app.schemas.user import (
    UserLogin,
    UserResponse,
    TokenResponse,
    CompleteRegistrationRequest,
    VerifyInvitationResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyResetTokenResponse,
    ResetPasswordRequest,
)
from app.services.auth_service import AuthService, get_current_user, security

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", status_code=status.HTTP_403_FORBIDDEN)
def register():
    """
    Public self-registration is disabled to prevent unauthorized account creation
    and privilege escalation attacks.
    Employee accounts must be created by an Administrator in a PENDING state,
    and completed via POST /auth/complete-registration with a single-use invitation token.
    """
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "Public self-registration is disabled. Employee accounts must be created by an Administrator. "
            "If you have received an invitation token, complete registration at POST /auth/complete-registration."
        )
    )


@router.get("/verify-invitation", response_model=VerifyInvitationResponse)
def verify_invitation(
    token: str = Query(..., min_length=16, description="Cryptographic invitation token"),
    session: Session = Depends(get_db)
):
    """
    Verifies an invitation token before the employee completes account activation.
    Ensures token is valid, matches a PENDING account, and has not expired.
    """
    token_hash = AuthService.hash_invitation_token(token)
    user = UserRepository.get_by_invitation_token_hash(session, token_hash)

    if not user or user.status != UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, used, or non-existent invitation token."
        )

    if user.invitation_expires_at:
        now_utc = datetime.now(timezone.utc)
        expires_at = user.invitation_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation token has expired. Please contact an Administrator to receive a new invitation."
            )

    return VerifyInvitationResponse(
        valid=True,
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        role=user.role,
        department=user.department,
        expires_at=user.invitation_expires_at,
        message="Invitation token is valid. You may proceed to set your password."
    )


@router.post("/complete-registration", response_model=UserResponse, status_code=status.HTTP_200_OK)
def complete_registration(
    req: CompleteRegistrationRequest,
    session: Session = Depends(get_db)
):
    """
    Employee completes account registration using their secure invitation token:
    1. Validates token hash and expiration against the PENDING account.
    2. Validates and hashes the new password using bcrypt.
    3. Activates the account (status -> ACTIVE).
    4. Invalidates single-use invitation token.
    5. Logs the activation audit event.
    """
    if len(req.password.strip()) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    token_hash = AuthService.hash_invitation_token(req.invitation_token)
    user = UserRepository.get_by_invitation_token_hash(session, token_hash)

    if not user or user.status != UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, already used, or non-existent invitation token."
        )

    if user.invitation_expires_at:
        now_utc = datetime.now(timezone.utc)
        expires_at = user.invitation_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invitation token has expired. Please contact an Administrator to receive a new invitation."
            )

    # Securely set user password and activate
    user.hashed_password = AuthService.hash_password(req.password)
    user.status = UserStatus.ACTIVE.value
    user.invitation_token_hash = None
    user.invitation_expires_at = None
    session.flush()

    ActivityLogRepository.log(
        session=session,
        action="REGISTRATION_COMPLETED",
        user_id=user.user_id,
        details=f"Employee {user.user_id} successfully completed registration and activated account"
    )
    return user


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, session: Session = Depends(get_db)):
    """
    Self-service password recovery request for any Employee, IT Support, or Admin:
    1. Looks up the user by User ID or Email.
    2. Issues a cryptographically signed, expiring (15m) reset token.
    3. Saves SHA-256 hash in the database.
    4. Returns verification token to client for demonstration and user self-reset.
    """
    clean_id = req.identifier.strip()
    user = UserRepository.get_by_user_id(session, clean_id) or UserRepository.get_by_email(session, clean_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No account found with identifier '{clean_id}'. Please verify your Employee ID or Work Email."
        )

    if user.status == UserStatus.DISABLED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account has been deactivated. Please contact an Administrator."
        )

    raw_token = AuthService.generate_reset_token()
    token_hash = AuthService.hash_reset_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    user.reset_token_hash = token_hash
    user.reset_token_expires_at = expires_at
    session.flush()

    ActivityLogRepository.log(
        session=session,
        action="PASSWORD_RESET_REQUESTED",
        user_id=user.user_id,
        details=f"Password reset token requested for {user.user_id} ({user.email})"
    )

    return ForgotPasswordResponse(
        message="Password reset instructions and verification code generated successfully.",
        user_id=user.user_id,
        email=user.email,
        reset_token=raw_token,
        expires_in_minutes=15
    )


@router.get("/verify-reset-token", response_model=VerifyResetTokenResponse)
def verify_reset_token(
    token: str = Query(..., min_length=8, description="Password reset verification token"),
    session: Session = Depends(get_db)
):
    """
    Verifies that a password reset token exists, is active, and has not expired.
    """
    token_hash = AuthService.hash_reset_token(token)
    user = UserRepository.get_by_reset_token_hash(session, token_hash)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, already used, or non-existent password reset token."
        )

    if user.reset_token_expires_at:
        now_utc = datetime.now(timezone.utc)
        expires_at = user.reset_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired (tokens are valid for 15 minutes). Please request a new code."
            )

    return VerifyResetTokenResponse(
        valid=True,
        user_id=user.user_id,
        name=user.name,
        email=user.email,
        message="Reset token verified successfully. You may proceed to set a new password."
    )


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(req: ResetPasswordRequest, session: Session = Depends(get_db)):
    """
    Sets a new password using a verified reset token:
    1. Validates password strength (min 8 characters).
    2. Matches token against stored SHA-256 hash.
    3. Hashes new password with Bcrypt.
    4. Invalidates single-use reset token.
    5. Logs the audit event.
    """
    if len(req.new_password.strip()) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )

    token_hash = AuthService.hash_reset_token(req.token)
    user = UserRepository.get_by_reset_token_hash(session, token_hash)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid, already used, or non-existent password reset token."
        )

    if user.reset_token_expires_at:
        now_utc = datetime.now(timezone.utc)
        expires_at = user.reset_token_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < now_utc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password reset token has expired. Please request a new code."
            )

    user.hashed_password = AuthService.hash_password(req.new_password)
    user.reset_token_hash = None
    user.reset_token_expires_at = None
    if user.status == UserStatus.PENDING.value:
        user.status = UserStatus.ACTIVE.value
    session.flush()

    ActivityLogRepository.log(
        session=session,
        action="PASSWORD_RESET_COMPLETED",
        user_id=user.user_id,
        details=f"User {user.user_id} successfully completed password reset"
    )

    return {
        "message": f"Password for {user.name} ({user.user_id}) has been updated successfully. You can now sign in.",
        "user_id": user.user_id
    }


@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, session: Session = Depends(get_db)):
    """
    Authenticates user credentials and returns a signed JWT access token.
    Strictly verifies passwords using bcrypt. Rejects disabled or pending accounts.
    """
    user = UserRepository.get_by_user_id(session, credentials.user_id)
    if not user:
        user = UserRepository.get_by_email(session, credentials.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Employee ID / Email or password."
        )

    # Reject accounts that have not completed registration
    if user.status == UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account registration is pending activation. Please complete registration using your invitation token."
        )

    # Reject disabled accounts
    if user.status == UserStatus.DISABLED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact an Administrator."
        )

    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active."
        )

    # Verify password against stored bcrypt hash (no bypasses or default fallbacks)
    is_valid = AuthService.verify_password(credentials.password, user.hashed_password)
    if not is_valid:
        ActivityLogRepository.log(
            session=session,
            action="LOGIN_FAILED",
            user_id=user.user_id,
            details="Failed login attempt: invalid credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid User ID or password."
        )

    token = AuthService.create_access_token(
        data={"sub": user.user_id, "role": user.role, "name": user.name}
    )
    ActivityLogRepository.log(
        session=session,
        action="USER_LOGIN",
        user_id=user.user_id,
        details="User logged in successfully"
    )
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: UserDB = Depends(get_current_user)):
    """Returns the authenticated user's profile details."""
    return current_user


@router.post("/logout")
def logout(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    current_user: UserDB = Depends(get_current_user),
    session: Session = Depends(get_db)
):
    """Logs out the current session and revokes the access token on the server side."""
    if credentials and credentials.credentials:
        AuthService.revoke_token(credentials.credentials)
    ActivityLogRepository.log(session, "USER_LOGOUT", current_user.user_id, "User logged out")
    return {"message": f"User {current_user.user_id} logged out successfully."}

