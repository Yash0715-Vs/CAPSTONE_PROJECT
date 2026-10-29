"""
Pydantic Validation Schemas for Users & Authentication.

Meets Capstone Specification Section 12:
- Request/response validation
- Token payloads and authentication schemas
"""

from enum import Enum
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRole(str, Enum):
    """Supported user roles."""
    ADMIN = "ADMIN"
    SUPPORT = "SUPPORT"
    EMPLOYEE = "EMPLOYEE"


class UserStatus(str, Enum):
    """User account lifecycle status."""
    ACTIVE = "ACTIVE"
    PENDING = "PENDING"
    DISABLED = "DISABLED"


class UserBase(BaseModel):
    user_id: str = Field(..., min_length=2, max_length=50, json_schema_extra={"example": "EMP-105"}, description="Unique employee / user ID")
    name: str = Field(..., min_length=2, max_length=100, json_schema_extra={"example": "Bruce Wayne"})
    email: EmailStr = Field(..., json_schema_extra={"example": "bruce.wayne@company.com"})
    role: UserRole = Field(default=UserRole.EMPLOYEE, json_schema_extra={"example": "EMPLOYEE"}, description="ADMIN, SUPPORT, or EMPLOYEE")
    department: Optional[str] = Field(default="General", json_schema_extra={"example": "Information Technology"})


class UserCreate(UserBase):
    """Admin-managed employee account creation schema (password is set by employee during registration)."""
    password: Optional[str] = Field(
        default=None,
        description="Optional/Ignored: Employees set their password during registration activation."
    )


class CompleteRegistrationRequest(BaseModel):
    """Payload submitted by employee to accept invitation and activate account."""
    invitation_token: str = Field(..., min_length=16, description="Cryptographic single-use invitation token")
    password: str = Field(..., min_length=8, description="New secure password (minimum 8 characters)")


class VerifyInvitationResponse(BaseModel):
    """Response returned when an employee verifies their invitation token."""
    valid: bool = True
    user_id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None
    expires_at: Optional[datetime] = None
    message: str = "Invitation token is valid."


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = Field(None, description="ADMIN, SUPPORT, or EMPLOYEE")
    status: Optional[UserStatus] = Field(None, description="ACTIVE, PENDING, or DISABLED")
    department: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    email: str
    role: str
    status: str
    department: Optional[str] = None
    created_at: Optional[datetime] = None


class UserCreateResponse(UserResponse):
    """Response returned upon Admin account creation including invitation details for pending accounts."""
    invitation_token: Optional[str] = None
    invitation_expires_at: Optional[datetime] = None
    message: Optional[str] = None


class UserLogin(BaseModel):
    user_id: str = Field(..., json_schema_extra={"example": "EMP-101"})
    password: str = Field(..., json_schema_extra={"example": "SecureP@ss123"})


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

