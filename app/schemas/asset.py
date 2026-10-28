"""
Pydantic Validation Schemas for IT Assets.
"""

from typing import Optional
from datetime import date
from pydantic import BaseModel, Field, ConfigDict


class AssetBase(BaseModel):
    asset_id: str = Field(..., json_schema_extra={"example": "LAP-1025"}, description="Unique Asset ID")
    type: str = Field(..., json_schema_extra={"example": "Laptop"}, description="Laptop, Monitor, Keyboard, Mouse, Printer")
    brand: str = Field(..., json_schema_extra={"example": "Dell"})
    model: str = Field(..., json_schema_extra={"example": "Latitude 5440"})
    serial_number: str = Field(..., json_schema_extra={"example": "ABC987654XYZ"})
    purchase_date: Optional[date] = Field(default_factory=date.today)
    status: Optional[str] = Field(default="AVAILABLE", json_schema_extra={"example": "AVAILABLE"})
    specs_json: Optional[str] = Field(None, json_schema_extra={"example": '{"ram_gb": 16, "processor": "i7"}'})


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    brand: Optional[str] = None
    model: Optional[str] = None
    status: Optional[str] = None
    assigned_to: Optional[str] = None
    specs_json: Optional[str] = None


class AssetAssignRequest(BaseModel):
    employee_id: str = Field(..., json_schema_extra={"example": "EMP-101"})
    notes: Optional[str] = Field(None, json_schema_extra={"example": "Issued for remote work"})


class AssetResponse(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assigned_to: Optional[str] = None
