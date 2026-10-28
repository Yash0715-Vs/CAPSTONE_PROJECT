"""
Pydantic Validation Schemas for Users & Authentication.

Meets Capstone Specification Section 12:
- Request/response validation
- Token payloads and authentication schemas
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    user_id: str = Field(..., json_schema_extra={"example": "EMP-105"}, description="Unique employee / user ID")
    name: str = Field(..., min_length=2, max_length=100, json_schema_extra={"example": "Bruce Wayne"})
    email: EmailStr = Field(..., json_schema_extra={"example": "bruce.wayne@company.com"})
    role: str = Field(default="EMPLOYEE", json_schema_extra={"example": "EMPLOYEE"}, description="ADMIN, SUPPORT, or EMPLOYEE")
    department: Optional[str] = Field(default="General", json_schema_extra={"example": "Information Technology"})


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, json_schema_extra={"example": "SecureP@ss123"})


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    role: Optional[str] = Field(None, description="ADMIN, SUPPORT, or EMPLOYEE")
    department: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: str
    name: str
    email: str
    role: str
    department: Optional[str] = None
    created_at: Optional[datetime] = None


class UserLogin(BaseModel):
    user_id: str = Field(..., json_schema_extra={"example": "EMP-101"})
    password: str = Field(..., json_schema_extra={"example": "SecureP@ss123"})


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
