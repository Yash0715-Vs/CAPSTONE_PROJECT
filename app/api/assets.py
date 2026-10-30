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
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.repositories import AssetRepository, UserRepository, ActivityLogRepository
from app.models.db_models import AssetDB, UserDB
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetAssignRequest
from app.services.auth_service import get_current_user, require_roles

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("", response_model=List[AssetResponse])
def list_assets(
    status_filter: Optional[str] = Query(None, alias="status"),
    assigned_to: Optional[str] = Query(None),
    session: Session = Depends(get_db),
    current_user: UserDB = Depends(get_current_user)
):
    """
    Lists assets.
    Employees see only assets assigned to them.
    IT Support and Admins can view all assets or filter by assignee.
    """
    if current_user.role == "EMPLOYEE":
        # Enforce that employees can only view hardware assigned to themselves
        assigned_to = current_user.user_id

    return AssetRepository.list_assets(session, status=status_filter, assigned_to=assigned_to)


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
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Creates a new hardware asset inventory record (Admin / Support only)."""
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
    ActivityLogRepository.log(session, "ASSET_CREATED", staff_user.user_id, f"Added asset {saved.asset_id}")
    return saved



@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: str,
    update_in: AssetUpdate,
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Updates asset details, brand, model, or status."""
    asset = AssetRepository.get_by_asset_id(session, asset_id)
    if not asset:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Asset '{asset_id}' not found.")

    if update_in.brand is not None:
        asset.brand = update_in.brand
    if update_in.model is not None:
        asset.model = update_in.model
    if update_in.status is not None:
        asset.status = update_in.status
    if update_in.assigned_to is not None:
        if update_in.assigned_to:
            emp = UserRepository.get_by_user_id(session, update_in.assigned_to)
            if not emp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Employee '{update_in.assigned_to}' not found."
                )
            asset.assigned_to = update_in.assigned_to
        else:
            asset.assigned_to = None
    if update_in.specs_json is not None:
        asset.specs_json = update_in.specs_json

    session.flush()
    ActivityLogRepository.log(session, "ASSET_UPDATED", staff_user.user_id, f"Updated asset {asset_id}")
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

    session.delete(asset)
    session.flush()
    ActivityLogRepository.log(session, "ASSET_DELETED", admin.user_id, f"Deleted asset {asset_id}")
    return {"message": f"Asset '{asset_id}' deleted successfully."}


@router.post("/{asset_id}/assign", response_model=AssetResponse)
def assign_asset_to_employee(
    asset_id: str,
    assign_req: AssetAssignRequest,
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Assigns an available hardware asset to an employee."""
    # Verify employee exists
    emp = UserRepository.get_by_user_id(session, assign_req.employee_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{assign_req.employee_id}' not found."
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
            staff_user.user_id,
            f"Assigned {asset_id} to {assign_req.employee_id}"
        )
        return updated_asset
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.post("/{asset_id}/return", response_model=AssetResponse)
def return_asset_to_inventory(
    asset_id: str,
    session: Session = Depends(get_db),
    staff_user: UserDB = Depends(require_roles(["ADMIN", "SUPPORT"]))
):
    """Returns an assigned asset back to AVAILABLE inventory."""
    try:
        updated_asset = AssetRepository.return_asset(session=session, asset_id=asset_id)
        ActivityLogRepository.log(
            session, "ASSET_RETURNED", staff_user.user_id, f"Returned {asset_id} to inventory"
        )
        return updated_asset
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
