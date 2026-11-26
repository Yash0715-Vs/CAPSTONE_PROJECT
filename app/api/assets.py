"""
Assets API Endpoints.

Meets Capstone Specification Section 12:
- GET    /assets
- GET    /assets/{asset_id}
- POST   /assets
- PUT    /assets/{asset_id}
- DELETE /assets/{asset_id}
- POST   /assets/{asset_id}/assign
- POST   /assets/{asset_id}/return
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.connection import get_db
from app.database.repositories import AssetRepository, UserRepository, ActivityLogRepository
from app.models.db_models import AssetDB, UserDB, AssetAssignmentDB
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetAssignRequest
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", response_model=List[AssetResponse])
def list_assets(
    status_filter: Optional[str] = Query(None, alias="status"),
    type_filter: Optional[str] = Query(None, alias="type"),
    search: Optional[str] = Query(None),
    assigned_to: Optional[str] = Query(None),
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Lists assets.
    Employees see only assets assigned to them.
    IT Support and Admins can view all assets or filter by assignee, status, type, and keyword.
    """
    if current_user.role == "EMPLOYEE":
        # Enforce that employees can only view hardware assigned to themselves
        assigned_to = current_user.user_id

    return AssetRepository.list_assets(
        session,
        status=status_filter,
        assigned_to=assigned_to,
        asset_type=type_filter,
        search=search
    )


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset_by_id(
    asset_id: str,
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """Retrieves specific hardware asset details."""
    asset = AssetRepository.get_by_asset_id(session, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found.")

    if current_user.role == "EMPLOYEE" and asset.assigned_to != current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view assets not assigned to you."
        )
    return asset


@router.post("", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    asset_in: AssetCreate,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Creates a new hardware asset inventory record (Admin only)."""
    if AssetRepository.get_by_asset_id(session, asset_in.asset_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Asset ID '{asset_in.asset_id}' already exists."
        )

    # Check serial number uniqueness
    existing_serial = session.query(AssetDB).filter(AssetDB.serial_number == asset_in.serial_number).first()
    if existing_serial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Serial number '{asset_in.serial_number}' is already registered to asset '{existing_serial.asset_id}'."
        )

    asset = AssetDB(
        asset_id=asset_in.asset_id,
        type=asset_in.type,
        brand=asset_in.brand,
        model=asset_in.model,
        serial_number=asset_in.serial_number,
        purchase_date=asset_in.purchase_date,
        status=asset_in.status or "AVAILABLE",
        specs_json=asset_in.specs_json,
    )
    saved = AssetRepository.create(session, asset)
    ActivityLogRepository.log(session, "ASSET_CREATED", admin.user_id, f"Added asset {saved.asset_id}")
    return saved



@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    update_in: AssetUpdate,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Updates asset details and atomically tracks any custody changes in asset_assignments (Admin only)."""
    asset = AssetRepository.get_by_asset_id(session, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found.")

    if update_in.type is not None:
        asset.type = update_in.type
    if update_in.brand is not None:
        asset.brand = update_in.brand
    if update_in.model is not None:
        asset.model = update_in.model
    if update_in.serial_number is not None and update_in.serial_number != asset.serial_number:
        existing_serial = session.query(AssetDB).filter(AssetDB.serial_number == update_in.serial_number).first()
        if existing_serial:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Serial number '{update_in.serial_number}' is already registered to asset '{existing_serial.asset_id}'."
            )
        asset.serial_number = update_in.serial_number
    if update_in.specs_json is not None:
        asset.specs_json = update_in.specs_json

    now_utc = datetime.now(timezone.utc)

    def _close_open_assignment(note: str) -> None:
        latest_assignment = (
            session.query(AssetAssignmentDB)
            .filter(
                AssetAssignmentDB.asset_id == asset_id,
                AssetAssignmentDB.returned_date.is_(None)
            )
            .order_by(desc(AssetAssignmentDB.assigned_date))
            .first()
        )
        if latest_assignment:
            latest_assignment.returned_date = now_utc
            if not latest_assignment.notes:
                latest_assignment.notes = note

    if update_in.assigned_to is not None:
        target_assignee = update_in.assigned_to.strip() or None
        if target_assignee:
            emp = UserRepository.get_by_user_id(session, target_assignee)
            if not emp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee '{target_assignee}' not found."
                )
            if emp.status != "ACTIVE":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Employee '{target_assignee}' has status '{emp.status}'. Assets can only be assigned to ACTIVE employees."
                )

            effective_status = update_in.status if update_in.status is not None else "ASSIGNED"
            if effective_status != "ASSIGNED":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot assign asset '{asset_id}' to '{target_assignee}' while status is '{effective_status}'."
                )

            if target_assignee != asset.assigned_to:
                previous_owner = asset.assigned_to
                _close_open_assignment(f"Reassigned to {target_assignee} by Admin {admin.user_id}")
                session.add(
                    AssetAssignmentDB(
                        asset_id=asset_id,
                        employee_id=target_assignee,
                        assigned_date=now_utc,
                        notes=f"Assigned by Admin {admin.user_id} via asset update"
                        + (f" (previous: {previous_owner})" if previous_owner else ""),
                    )
                )
                asset.assigned_to = target_assignee
                asset.status = "ASSIGNED"
                ActivityLogRepository.log(
                    session,
                    "ASSET_REASSIGNED" if previous_owner else "ASSET_ASSIGNED",
                    admin.user_id,
                    f"Admin {admin.user_id} assigned {asset_id} to {target_assignee}"
                    + (f" from {previous_owner}" if previous_owner else ""),
                )
        else:
            if asset.assigned_to is not None:
                previous_owner = asset.assigned_to
                _close_open_assignment(f"Unassigned by Admin {admin.user_id} via asset update")
                asset.assigned_to = None
                ActivityLogRepository.log(
                    session,
                    "ASSET_RETURNED",
                    admin.user_id,
                    f"Admin {admin.user_id} unassigned {asset_id} from {previous_owner}",
                )
            if update_in.status is None and asset.status == "ASSIGNED":
                asset.status = "AVAILABLE"

    if update_in.status is not None:
        if update_in.status == "ASSIGNED" and not asset.assigned_to:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set asset status to ASSIGNED without specifying assigned_to."
            )
        if asset.status == "ASSIGNED" and update_in.status != "ASSIGNED":
            _close_open_assignment(f"Status changed to {update_in.status} by Admin {admin.user_id}")
            asset.assigned_to = None
        asset.status = update_in.status

    session.flush()
    ActivityLogRepository.log(session, "ASSET_UPDATED", admin.user_id, f"Updated asset {asset_id}")
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_200_OK)
def delete_asset(
    asset_id: str,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Permanently deletes an asset (Admin only)."""
    asset = AssetRepository.get_by_asset_id(session, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found.")

    if asset.status == "ASSIGNED" or asset.assigned_to is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete asset '{asset_id}' while it is currently ASSIGNED to employee '{asset.assigned_to}'. Please return the asset first."
        )

    session.delete(asset)
    session.flush()
    ActivityLogRepository.log(session, "ASSET_DELETED", admin.user_id, f"Deleted asset {asset_id}")
    return {"message": f"Asset '{asset_id}' deleted successfully."}


@router.post("/{asset_id}/assign", response_model=AssetResponse)
def assign_asset_to_employee(
    asset_id: str,
    assign_req: AssetAssignRequest,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Assigns an available hardware asset to an employee (Admin only)."""
    # Verify employee exists
    emp = UserRepository.get_by_user_id(session, assign_req.employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{assign_req.employee_id}' not found."
        )
    if emp.status != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Employee '{assign_req.employee_id}' has status '{emp.status}'. Assets can only be assigned to ACTIVE employees."
        )

    try:
        updated_asset = AssetRepository.assign_asset(
            session=session,
            asset_id=asset_id,
            employee_id=assign_req.employee_id,
            notes=assign_req.notes
        )
        ActivityLogRepository.log(
            session,
            "ASSET_ASSIGNED",
            admin.user_id,
            f"Assigned {asset_id} to {assign_req.employee_id}"
        )
        return updated_asset
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.post("/{asset_id}/return", response_model=AssetResponse)
def return_asset_to_inventory(
    asset_id: str,
    session: Session = Depends(get_db),
    admin: UserDB = Depends(require_roles(["ADMIN"]))
):
    """Returns an assigned asset back to AVAILABLE inventory (Admin only)."""
    try:
        updated_asset = AssetRepository.return_asset(session=session, asset_id=asset_id)
        ActivityLogRepository.log(
            session, "ASSET_RETURNED", admin.user_id, f"Returned {asset_id} to inventory"
        )
        return updated_asset
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
