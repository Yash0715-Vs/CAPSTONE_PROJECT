"""
Pydantic Validation Schemas for Support Tickets.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, example="Laptop blue screen crash")
    description: str = Field(..., min_length=5, example="System crashes with BSOD error code 0x0000001A during boot")
    category: Optional[str] = Field(None, example="Hardware", description="If omitted, will be auto-classified")
    priority: Optional[str] = Field(None, example="HIGH", description="If omitted, will be auto-classified")


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=5)
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TicketAssignRequest(BaseModel):
    assigned_to: str = Field(..., example="IT-501")


class TicketResolveRequest(BaseModel):
    resolution: str = Field(..., min_length=5, example="Replaced faulty RAM module; system tested stable.")


class TicketResponse(BaseModel):
    id: int
    ticket_id: str
    title: str
    description: str
    category: str
    priority: str
    status: str
    created_by: str
    assigned_to: Optional[str] = None
    resolution: Optional[str] = None
    created_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None

    class Config:
        from_attributes = True
