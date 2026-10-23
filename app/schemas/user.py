"""
Pydantic Validation Schemas for Users & Authentication.

Meets Capstone Specification Section 12:
- Request/response validation
- Token payloads and authentication schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    user_id: str = Field(..., example="EMP-105", description="Unique employee / user ID")
    name: str = Field(..., min_length=2, max_length=100, example="Bruce Wayne")
    email: EmailStr = Field(..., example="bruce.wayne@company.com")
    role: str = Field(default="EMPLOYEE", example="EMPLOYEE", description="ADMIN, SUPPORT, or EMPLOYEE")
    department: Optional[str] = Field(default="General", example="Information Technology")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, example="SecureP@ss123")


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, description="ADMIN, SUPPORT, or EMPLOYEE")
    department: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(BaseModel):
    id: int
    user_id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    user_id: str = Field(..., example="EMP-101")
    password: str = Field(..., example="SecureP@ss123")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
