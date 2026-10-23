"""
Unit tests for Asset Management Models & OOP.

Meets Capstone Specification Section 15:
- Asset creation
- Inheritance and polymorphism
- Encapsulation & property validation
- Asset assignment & return
- Custom exceptions (InvalidAssetError, InvalidStatusTransitionError)
"""

import pytest
from datetime import date

from app.models.asset import (
    Asset,
    Laptop,
    Monitor,
    Keyboard,
    Mouse,
    Printer,
    HardwareSpecs,
    AssetStatus,
)
from app.utils.exceptions import InvalidAssetError, InvalidStatusTransitionError


def test_create_laptop_with_specs():
    """Tests Laptop creation with composed HardwareSpecs."""
    specs = HardwareSpecs(processor="Intel Core i7-1370P", ram_gb=32, storage_gb=1024)
    laptop = Laptop(
        asset_id="LAP-100",
        brand="Dell",
        model="Latitude 5440",
        serial_number="SN-123456",
        specs=specs,
        battery_health_percent=95,
    )
    assert laptop.asset_id == "LAP-100"
    assert laptop.brand == "Dell"
    assert laptop.status == AssetStatus.AVAILABLE
    assert laptop.specs.ram_gb == 32
    assert laptop.get_asset_type() == "Laptop"


def test_asset_encapsulation_serial_number():
    """Tests encapsulation: serial number setter validates length."""
    asset = Asset(
        asset_id="GEN-01",
        brand="Generic",
        model="Model-X",
        serial_number="ABC123XYZ",
    )
    assert asset.serial_number == "ABC123XYZ"

    # Valid update
    asset.serial_number = "NEW-SERIAL-999"
    assert asset.serial_number == "NEW-SERIAL-999"

    # Invalid update raises exception
    with pytest.raises(InvalidAssetError):
        asset.serial_number = "1"


def test_asset_assignment_flow():
    """Tests assigning available asset to an employee."""
    laptop = Laptop(
        asset_id="LAP-101",
        brand="Apple",
        model="MacBook Pro",
        serial_number="SN-M3-999",
    )
    assert laptop.status == AssetStatus.AVAILABLE
    assert laptop.assigned_to is None

    laptop.assign_to_employee("EMP-101")
    assert laptop.status == AssetStatus.ASSIGNED
    assert laptop.assigned_to == "EMP-101"

    # Cannot assign already assigned asset
    with pytest.raises(InvalidStatusTransitionError):
        laptop.assign_to_employee("EMP-102")


def test_asset_return_flow():
    """Tests returning an assigned asset back to inventory."""
    laptop = Laptop(
        asset_id="LAP-102",
        brand="Lenovo",
        model="ThinkPad",
        serial_number="SN-LN-888",
    )
    laptop.assign_to_employee("EMP-200")
    assert laptop.status == AssetStatus.ASSIGNED

    laptop.return_asset()
    assert laptop.status == AssetStatus.AVAILABLE
    assert laptop.assigned_to is None

    # Cannot return available asset
    with pytest.raises(InvalidStatusTransitionError):
        laptop.return_asset()


def test_invalid_asset_empty_id():
    """Tests that asset creation rejects blank asset_id."""
    with pytest.raises(InvalidAssetError):
        Asset(
            asset_id="",
            brand="Dell",
            model="Latitude",
            serial_number="SN-123",
        )


def test_invalid_status_transition_assign_retired():
    """Tests that retired assets cannot be assigned or put under repair."""
    asset = Asset(
        asset_id="LAP-999",
        brand="HP",
        model="Pavilion",
        serial_number="SN-HP-000",
    )
    asset.retire_asset()
    assert asset.status == AssetStatus.RETIRED

    with pytest.raises(InvalidStatusTransitionError):
        asset.assign_to_employee("EMP-101")

    with pytest.raises(InvalidStatusTransitionError):
        asset.mark_under_repair()


def test_polymorphism_specs():
    """Tests polymorphic get_details() across distinct child classes."""
    laptop = Laptop("L-1", "Dell", "XPS", "SN-L1", HardwareSpecs("i9", 64, 2048))
    monitor = Monitor("M-1", "LG", "UltraFine", "SN-M1", screen_size_inches=32.0, resolution="4K")
    mouse = Mouse("MS-1", "Logitech", "MX Master", "SN-MS1", is_wireless=True, dpi=4000)

    l_details = laptop.get_details()
    m_details = monitor.get_details()
    ms_details = mouse.get_details()

    assert l_details["type"] == "Laptop"
    assert "hardware_specs" in l_details
    assert m_details["type"] == "Monitor"
    assert m_details["resolution"] == "4K"
    assert ms_details["type"] == "Mouse"
    assert ms_details["is_wireless"] is True
