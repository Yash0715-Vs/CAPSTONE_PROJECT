"""
Equipment Request API Endpoints.

Meets Monday Technical Requirements & Audit Specifications:
Lifecycle State Machine:
1. EMPLOYEE submits:  POST /equipment-requests (Status: PENDING)
2. ADMIN approves:    POST /equipment-requests/{id}/approve (Status: APPROVED)
   OR rejects:        POST /equipment-requests/{id}/reject (Status: REJECTED)
3. ADMIN provisions:  POST /equipment-requests/{id}/provision (Status: PROVISIONED, requires valid, active asset)
4. EMPLOYEE verifies: POST /equipment-requests/{id}/verify (Status: VERIFIED, confirms hardware receipt)
5. EMPLOYEE/ADMIN:    POST /equipment-requests/{id}/close (Status: CLOSED, follows verification)

Audit History:
- Every lifecycle stage persistently records an audit row in EquipmentRequestHistoryDB
- Recording actor, action, old_status, new_status, asset_id, notes, and server timestamp
- GET /equipment-requests/{id}/history exposes the complete chronological trail
"""

from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, Field

from app.database.connection import get_db
from app.database.repositories import ActivityLogRepository
from app.models.db_models import (
    EquipmentRequestDB,
    EquipmentRequestHistoryDB,
    AssetDB,
    UserDB,
    AssetAssignmentDB,
)
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
    current_user: UserDB = Depends(require_roles(["EMPLOYEE", "ADMIN", "SUPPORT"]))
):
    """Submits a new hardware equipment provisioning request (Employee, IT Support, or Admin)."""
    if req_in.equipment_type not in VALID_EQUIPMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid equipment type. Allowed types: {', '.join(VALID_EQUIPMENT_TYPES)}"
        )

    now = datetime.now(timezone.utc)
    max_retries = 5
    req = None
    for attempt in range(max_retries):
        last = session.query(EquipmentRequestDB).order_by(EquipmentRequestDB.id.desc()).first()
        next_num = (last.id + 1 + attempt) if last else (1 + attempt)
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
            created_at=now,
            updated_at=now,
        )
        session.add(req)
        try:
            session.flush()
            break
        except IntegrityError:
            session.rollback()
            if attempt == max_retries - 1:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Could not generate unique equipment request ID due to concurrent traffic. Please retry."
                )

    # Persistent audit history record
    hist = EquipmentRequestHistoryDB(
        request_id=request_id,
        actor=current_user.user_id,
        action="CREATED",
        old_status=None,
        new_status="PENDING",
        asset_id=None,
        notes=req_in.reason,
        timestamp=now
    )
    session.add(hist)
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


@router.get("/{request_id}/history")
def get_equipment_request_history(
    request_id: str,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Returns full chronological audit trail for an equipment request.
    Employees may only view audit history of their own requests; Admins/Support can inspect all.
    """
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )
    if current_user.role == "EMPLOYEE" and req.requested_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are only authorized to view audit history of your own equipment requests."
        )

    history = (
        session.query(EquipmentRequestHistoryDB)
        .filter(EquipmentRequestHistoryDB.request_id == request_id)
        .order_by(EquipmentRequestHistoryDB.timestamp.asc())
        .all()
    )
    return [h.to_dict() for h in history]


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

    old_status = req.status
    now = datetime.now(timezone.utc)
    req.status = "APPROVED"
    req.approved_by = admin.user_id
    if action.admin_notes:
        req.admin_notes = action.admin_notes
    req.updated_at = now
    session.flush()

    hist = EquipmentRequestHistoryDB(
        request_id=request_id,
        actor=admin.user_id,
        action="APPROVED",
        old_status=old_status,
        new_status="APPROVED",
        asset_id=None,
        notes=action.admin_notes or f"Approved by Admin {admin.user_id}",
        timestamp=now
    )
    session.add(hist)
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
            detail=f"Cannot reject request in '{req.status}' status (only PENDING or APPROVED requests can be rejected)."
        )

    old_status = req.status
    now = datetime.now(timezone.utc)
    req.status = "REJECTED"
    req.approved_by = admin.user_id
    if action.admin_notes:
        req.admin_notes = action.admin_notes
    req.updated_at = now
    session.flush()

    hist = EquipmentRequestHistoryDB(
        request_id=request_id,
        actor=admin.user_id,
        action="REJECTED",
        old_status=old_status,
        new_status="REJECTED",
        asset_id=None,
        notes=action.admin_notes or f"Rejected by Admin {admin.user_id}",
        timestamp=now
    )
    session.add(hist)
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
    """
    Admin provisions hardware for an approved request, associating a valid verified asset.
    Strictly prohibits transitioning to PROVISIONED without a valid asset.
    """
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

    # Strictly require valid provisioned_asset_id
    if not action.provisioned_asset_id or not action.provisioned_asset_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid provisioned_asset_id is required to provision equipment. Cannot mark PROVISIONED without hardware allocation."
        )

    clean_asset_id = action.provisioned_asset_id.strip()
    asset = session.query(AssetDB).filter(AssetDB.asset_id == clean_asset_id).first()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Asset '{clean_asset_id}' not found in asset inventory."
        )

    if asset.status != "AVAILABLE" or asset.assigned_to is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset '{clean_asset_id}' is not available for provisioning (current status: '{asset.status}', assigned to: {asset.assigned_to})."
        )

    # Equipment type matching check
    if (asset.type or "").strip().lower() != (req.equipment_type or "").strip().lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset '{clean_asset_id}' type '{asset.type}' does not match requested equipment type '{req.equipment_type}'."
        )

    old_status = req.status
    now = datetime.now(timezone.utc)

    # Atomically assign the asset in the inventory system to the requesting employee
    asset.status = "ASSIGNED"
    asset.assigned_to = req.requested_by

    assignment = AssetAssignmentDB(
        asset_id=clean_asset_id,
        employee_id=req.requested_by,
        assigned_date=now,
        notes=f"Provisioned via Equipment Request #{request_id}"
    )
    session.add(assignment)

    req.provisioned_asset_id = clean_asset_id
    req.status = "PROVISIONED"
    if action.admin_notes:
        req.admin_notes = (req.admin_notes or "") + f" | Provision notes: {action.admin_notes}"
    req.updated_at = now
    session.flush()

    hist = EquipmentRequestHistoryDB(
        request_id=request_id,
        actor=admin.user_id,
        action="PROVISIONED",
        old_status=old_status,
        new_status="PROVISIONED",
        asset_id=clean_asset_id,
        notes=action.admin_notes or f"Provisioned with asset {clean_asset_id} ({asset.brand} {asset.model})",
        timestamp=now
    )
    session.add(hist)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_PROVISIONED",
        admin.user_id,
        f"Admin {admin.user_id} provisioned {request_id} with asset {clean_asset_id}"
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

    old_status = req.status
    now = datetime.now(timezone.utc)
    req.status = "VERIFIED"
    if action.employee_notes:
        req.employee_notes = action.employee_notes
    req.updated_at = now
    session.flush()

    hist = EquipmentRequestHistoryDB(
        request_id=request_id,
        actor=current_user.user_id,
        action="VERIFIED",
        old_status=old_status,
        new_status="VERIFIED",
        asset_id=req.provisioned_asset_id,
        notes=action.employee_notes or "Hardware receipt verified by employee",
        timestamp=now
    )
    session.add(hist)
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
    """
    Closes an equipment request following verification.
    Only the requesting employee or an Administrator can close the request.
    Strictly requires request status to be VERIFIED.
    """
    req = session.query(EquipmentRequestDB).filter(EquipmentRequestDB.request_id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Equipment request '{request_id}' not found."
        )

    # RBAC check: only requesting user or Administrator
    if current_user.role != "ADMIN" and req.requested_by != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the requesting user or an Administrator is authorized to close equipment requests."
        )

    if req.status != "VERIFIED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot close request in '{req.status}' status (request must be VERIFIED by employee before closure)."
        )

    old_status = req.status
    now = datetime.now(timezone.utc)
    req.status = "CLOSED"
    if action.employee_notes:
        req.employee_notes = (req.employee_notes or "") + f" | Close: {action.employee_notes}"
    req.updated_at = now
    session.flush()

    hist = EquipmentRequestHistoryDB(
        request_id=request_id,
        actor=current_user.user_id,
        action="CLOSED",
        old_status=old_status,
        new_status="CLOSED",
        asset_id=req.provisioned_asset_id,
        notes=action.employee_notes or f"Closed by {current_user.user_id} ({current_user.role})",
        timestamp=now
    )
    session.add(hist)
    session.flush()

    ActivityLogRepository.log(
        session,
        "EQUIPMENT_REQUEST_CLOSED",
        current_user.user_id,
        f"Closed equipment request {request_id}"
    )
    return req.to_dict()
