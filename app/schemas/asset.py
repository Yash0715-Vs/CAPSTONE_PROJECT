"""
Pydantic Validation Schemas for IT Assets.
"""

from typing import Optional, Dict, Any
from datetime import date
from pydantic import BaseModel, Field


class AssetBase(BaseModel):
    asset_id: str = Field(..., example="LAP-1025", description="Unique Asset ID")
    type: str = Field(..., example="Laptop", description="Laptop, Monitor, Keyboard, Mouse, Printer")
    brand: str = Field(..., example="Dell")
    model: str = Field(..., example="Latitude 5440")
    serial_number: str = Field(..., example="ABC987654XYZ")
    purchase_date: Optional[date] = Field(default_factory=date.today)
    status: Optional[str] = Field(default="AVAILABLE", example="AVAILABLE")
    specs_json: Optional[str] = Field(None, example='{"ram_gb": 16, "processor": "i7"}')


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    specs_json: Optional[str] = None


class AssetAssignRequest(BaseModel):
    employee_id: str = Field(..., example="EMP-101")
    notes: Optional[str] = Field(None, example="Issued for remote work")


class AssetResponse(AssetBase):
    id: int
    assigned_to: Optional[str] = None

    class Config:
        from_attributes = True
