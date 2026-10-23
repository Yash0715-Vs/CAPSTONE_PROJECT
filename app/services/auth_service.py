"""
Authentication and JWT Security Service.

Meets Capstone Specification Section 39:
- Password hashing and verification using bcrypt (passwords never stored plain text)
- JSON Web Token (JWT) encoding, decoding, and expiration validation
- Role-Based Access Control (RBAC) FastAPI dependencies
"""

import sys
import os
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

from app.database.connection import get_db
from app.database.repositories import UserRepository
from app.models.db_models import UserDB

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY", "super_secret_jwt_key_capstone_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

security = HTTPBearer(auto_error=False)


class AuthService:
    """Handles password hashing, token lifecycle, and authentication checks."""

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
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Generates a signed JWT access token."""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Dict[str, Any]:
        """Decodes and validates a JWT token."""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
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
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = AuthService.decode_token(token)
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = UserRepository.get_by_user_id(session, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")

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
