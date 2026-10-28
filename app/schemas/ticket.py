"""
Pydantic Validation Schemas for Support Tickets.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class TicketBase(BaseModel):
    title: str = Field(..., min_length=3, max_length=200, json_schema_extra={"example": "Laptop blue screen crash"})
    description: str = Field(..., min_length=5, json_schema_extra={"example": "System crashes with BSOD error code 0x0000001A during boot"})
    category: Optional[str] = Field(None, json_schema_extra={"example": "Hardware"}, description="If omitted, will be auto-classified")
    priority: Optional[str] = Field(None, json_schema_extra={"example": "HIGH"}, description="If omitted, will be auto-classified")


class TicketCreate(TicketBase):
    pass


class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, min_length=5)
    category: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None


class TicketAssignRequest(BaseModel):
    assigned_to: str = Field(..., json_schema_extra={"example": "IT-501"})


class TicketResolveRequest(BaseModel):
    resolution: str = Field(..., min_length=5, json_schema_extra={"example": "Replaced faulty RAM module; system tested stable."})


class TicketResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

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
