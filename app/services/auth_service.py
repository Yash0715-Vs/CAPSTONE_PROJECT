"""
Authentication and JWT Security Service.

Meets Capstone Specification Section 39:
- Password hashing and verification using bcrypt (passwords never stored plain text)
- JSON Web Token (JWT) encoding, decoding, and expiration validation
- Role-Based Access Control (RBAC) FastAPI dependencies
"""

import sys
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.config import config
from app.database.connection import get_db, db_manager
from app.database.repositories import UserRepository
from app.models.db_models import UserDB, UserStatus, RevokedTokenDB

security = HTTPBearer(auto_error=False)


class AuthService:
    """Handles password hashing, token lifecycle, invitation tokens, and authentication checks."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hashes password using bcrypt with random salt."""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verifies plain password against hashed password."""
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
        except Exception:
            return False

    @staticmethod
    def generate_invitation_token() -> str:
        """Generates a cryptographically secure, unpredictable invitation token."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def hash_invitation_token(token: str) -> str:
        """Computes SHA-256 hash of an invitation token for safe database storage."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def generate_reset_token() -> str:
        """Generates a secure, human-friendly password reset token."""
        return f"RST-{secrets.token_hex(16).upper()}"

    @staticmethod
    def hash_reset_token(token: str) -> str:
        """Computes SHA-256 hash of a password reset token for safe database storage."""
        return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()

    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Generates a signed JWT access token using centralized configuration."""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=config.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        to_encode.update({"exp": expire, "jti": secrets.token_hex(16)})
        return jwt.encode(to_encode, config.SECRET_KEY, algorithm=config.ALGORITHM)

    @staticmethod
    def hash_access_token(token: str) -> str:
        """Computes SHA-256 hash of a JWT token for persistent revocation lookup."""
        return hashlib.sha256(token.strip().encode("utf-8")).hexdigest()

    @classmethod
    def revoke_token(
        cls,
        token: str,
        session: Optional[Session] = None,
        user_id: Optional[str] = None,
    ) -> None:
        """
        Revokes a JWT token persistently in the `revoked_tokens` database table.
        Shared across all backend workers and preserved across server restarts.
        """
        if not token or not token.strip():
            return

        clean_token = token.strip()
        token_hash = cls.hash_access_token(clean_token)
        jti: Optional[str] = None
        sub: Optional[str] = user_id
        expires_at: Optional[datetime] = None

        try:
            unverified = jwt.decode(
                clean_token,
                options={"verify_signature": False, "verify_exp": False},
            )
            jti = unverified.get("jti")
            sub = sub or unverified.get("sub")
            exp_ts = unverified.get("exp")
            if isinstance(exp_ts, (int, float)):
                expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc)
        except Exception:
            pass

        def _persist(db: Session) -> None:
            now_utc = datetime.now(timezone.utc)
            # Prune expired revocations opportunistically
            db.query(RevokedTokenDB).filter(
                RevokedTokenDB.expires_at.isnot(None),
                RevokedTokenDB.expires_at < now_utc,
            ).delete(synchronize_session=False)

            exists = db.query(RevokedTokenDB).filter(
                RevokedTokenDB.token_hash == token_hash
            ).first()
            if not exists:
                db.add(
                    RevokedTokenDB(
                        token_hash=token_hash,
                        jti=jti,
                        user_id=sub,
                        expires_at=expires_at,
                        revoked_at=now_utc,
                    )
                )
                db.flush()

        if session is not None:
            _persist(session)
        else:
            with db_manager.get_session() as db:
                _persist(db)

    @classmethod
    def is_token_revoked(cls, token: str, session: Optional[Session] = None) -> bool:
        """Checks whether token has been revoked in the persistent database store."""
        if not token or not token.strip():
            return False
        token_hash = cls.hash_access_token(token)

        def _check(db: Session) -> bool:
            return (
                db.query(RevokedTokenDB.id)
                .filter(RevokedTokenDB.token_hash == token_hash)
                .first()
                is not None
            )

        if session is not None:
            return _check(session)
        with db_manager.get_session() as db:
            return _check(db)

    @classmethod
    def decode_token(cls, token: str, session: Optional[Session] = None) -> Dict[str, Any]:
        """Decodes and validates a JWT token using centralized configuration and DB revocation store."""
        if cls.is_token_revoked(token, session=session):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            payload = jwt.decode(token, config.SECRET_KEY, algorithms=[config.ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please log in again.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    session: Session = Depends(get_db)
) -> UserDB:
    """
    FastAPI dependency that extracts and validates the logged-in user from Bearer Token.
    Enforces active account status.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = AuthService.decode_token(token, session=session)
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

    # Reject pending or disabled accounts from accessing protected resources
    if user.status == UserStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account registration is pending activation.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status == UserStatus.DISABLED.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact an administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.status != UserStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is not active.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_roles(allowed_roles: List[str]):
    """
    FastAPI RBAC dependency factory:
    Restricts access to specific roles (e.g., ['ADMIN'] or ['ADMIN', 'SUPPORT']).
    """
    def role_checker(current_user: UserDB = Depends(get_current_user)) -> UserDB:
        user_role = (current_user.role or "").upper()
        allowed = [r.upper() for r in allowed_roles]
        if user_role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Required role in {allowed_roles}, but you have role '{user_role}'."
            )
        return current_user
    return role_checker

