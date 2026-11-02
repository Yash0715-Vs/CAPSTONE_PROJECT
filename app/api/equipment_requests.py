"""
Equipment Request API Endpoints.

Lifecycle:
1. EMPLOYEE submits: POST /equipment-requests (Status: PENDING)
2. ADMIN approves:   POST /equipment-requests/{id}/approve (Status: APPROVED)
   OR rejects:       POST /equipment-requests/{id}/reject (Status: REJECTED)
3. ADMIN provisions: POST /equipment-requests/{id}/provision (Status: PROVISIONED, links asset_id)
4. EMPLOYEE verifies:POST /equipment-requests/{id}/verify (Status: VERIFIED, confirms receipt)
5. EMPLOYEE/ADMIN:   POST /equipment-requests/{id}/close (Status: CLOSED)
"""

from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database.connection import get_db
from app.database.repositories import ActivityLogRepository
from app.models.db_models import EquipmentRequestDB, AssetDB, UserDB
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/equipment-requests", tags=["Equipment Requests"])

VALID_EQUIPMENT_TYPES = [
    "Laptop",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Printer",
    "Headset",
    "Webcam",
    "Docking Station",
    "Other",
]


class EquipmentRequestCreate(BaseModel):
    equipment_type: str = Field(..., description="Type of hardware requested")
    reason: str = Field(..., min_length=5, description="Business justification")


class AdminActionRequest(BaseModel):
    admin_notes: Optional[str] = None
    provisioned_asset_id: Optional[str] = None


class EmployeeActionRequest(BaseModel):
    employee_notes: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_equipment_request(
    req_in: EquipmentRequestCreate,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(require_roles(["EMPLOYEE"]))
):
    """Employee submits a new hardware equipment provisioning request."""
    if req_in.equipment_type not in VALID_EQUIPMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid equipment type. Allowed types: {', '.join(VALID_EQUIPMENT_TYPES)}"
        )

    last = session.query(EquipmentRequestDB).order_by(EquipmentRequestDB.id.desc()).first()
    next_num = (last.id + 1) if last else 1
    request_id = f"EQR-{1000 + next_num}"
    while session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first():
        next_num += 1
        request_id = f"EQR-{1000 + next_num}"

    req = EquipmentRequestDB(
        request_id=request_id,
        requested_by=current_user.user_id,
        equipment_type=req_in.equipment_type,
        reason=req_in.reason,
        status="PENDING",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session.add(req)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_CREATED",
        current_user.user_id,
        f"Submitted equipment request {request_id} for {req_in.equipment_type}"
    )
    return req.to_dict()


@router.get("")
def list_equipment_requests(
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Lists equipment requests.
    Employees see only requests submitted by them.
    Admin and Support staff see all requests across the organization.
    """
    query = session.query(EquipmentRequestDB)
    if current_user.role == "EMPLOYEE":
        query = query.filter(EquipmentRequestDB.requested_by == current_user.user_id)
    return [r.to_dict() for r in query.order_by(EquipmentRequestDB.created_at.desc()).all()]


@router.get("/{request_id}")
def get_equipment_request(
    request_id: str,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Retrieves specific equipment request details."""
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if current_user.role == "EMPLOYEE" and req.requested_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to view your own equipment requests."
        )
    return req.to_dict()


@router.post("/{request_id}/approve")
def approve_equipment_request(
    request_id: str,
    action: AdminActionRequest,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin approves a pending equipment request."""
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if req.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve request in '{req.status}' status (must be PENDING)."
        )

    req.status = "APPROVED"
    req.approved_by = admin.user_id
    if action.admin_notes:
        req.admin_notes = action.admin_notes
    req.updated_at = datetime.now(timezone.utc)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_APPROVED",
        admin.user_id,
        f"Admin {admin.user_id} approved equipment request {request_id}"
    )
    return req.to_dict()


@router.post("/{request_id}/reject")
def reject_equipment_request(
    request_id: str,
    action: AdminActionRequest,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin rejects a pending or approved equipment request."""
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if req.status not in ("PENDING", "APPROVED"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject request in '{req.status}' status."
        )

    req.status = "REJECTED"
    req.approved_by = admin.user_id
    if action.admin_notes:
        req.admin_notes = action.admin_notes
    req.updated_at = datetime.now(timezone.utc)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_REJECTED",
        admin.user_id,
        f"Admin {admin.user_id} rejected equipment request {request_id}"
    )
    return req.to_dict()


@router.post("/{request_id}/provision")
def provision_equipment_request(
    request_id: str,
    action: AdminActionRequest,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Admin provisions hardware for an approved request, associating an asset."""
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if req.status != "APPROVED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot provision request in '{req.status}' status (must be APPROVED first)."
        )

    if action.provisioned_asset_id:
        asset = session.query(AssetDB).filter(AssetDB.asset_id == action.provisioned_asset_id).first()
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Asset '{action.provisioned_asset_id}' not found."
            )
        req.provisioned_asset_id = action.provisioned_asset_id

    req.status = "PROVISIONED"
    if action.admin_notes:
        req.admin_notes = (req.admin_notes or "") + f" | Provision notes: {action.admin_notes}"
    req.updated_at = datetime.now(timezone.utc)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_PROVISIONED",
        admin.user_id,
        f"Admin {admin.user_id} provisioned {request_id} with asset {action.provisioned_asset_id or 'N/A'}"
    )
    return req.to_dict()


@router.post("/{request_id}/verify")
def verify_equipment_request(
    request_id: str,
    action: EmployeeActionRequest,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(require_roles(["EMPLOYEE"]))
):
    """Employee confirms physical receipt and setup of provisioned equipment."""
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if req.requested_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to verify receipt of your own equipment requests."
        )
    if req.status != "PROVISIONED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify request in '{req.status}' status (must be PROVISIONED)."
        )

    req.status = "VERIFIED"
    if action.employee_notes:
        req.employee_notes = action.employee_notes
    req.updated_at = datetime.now(timezone.utc)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_VERIFIED",
        current_user.user_id,
        f"Employee {current_user.user_id} verified receipt for {request_id}"
    )
    return req.to_dict()


@router.post("/{request_id}/close")
def close_equipment_request(
    request_id: str,
    action: EmployeeActionRequest,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Closes an equipment request following verification."""
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if current_user.role == "EMPLOYEE" and req.requested_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to close your own equipment requests."
        )
    if req.status != "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close request in '{req.status}' status (must be VERIFIED)."
        )

    req.status = "CLOSED"
    if action.employee_notes:
        req.employee_notes = (req.employee_notes or "") + f" | Close: {action.employee_notes}"
    req.updated_at = datetime.now(timezone.utc)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_CLOSED",
        current_user.user_id,
        f"Closed equipment request {request_id}"
    )
    return req.to_dict()
