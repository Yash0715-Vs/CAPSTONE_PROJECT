"""
Asset Management Models.

Demonstrates core Object-Oriented Programming (OOP) concepts:
- Inheritance (Base Asset -> Laptop, Monitor, Keyboard, Mouse, Printer)
- Encapsulation (Private/protected attributes and validated properties)
- Polymorphism (Overriding get_details across subclasses)
- Composition (HardwareSpecs composed inside device models)
"""

import sys
from pathlib import Path
from datetime import date, datetime
from enum import Enum
from typing import Optional, Dict, Any

# Ensure project root is in sys.path so the file can be executed directly
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.utils.exceptions import InvalidAssetError, InvalidStatusTransitionError


class AssetStatus(str, Enum):
    """Enumeration of valid asset lifecycle statuses."""
    AVAILABLE = "AVAILABLE"
    ASSIGNED = "ASSIGNED"
    UNDER_REPAIR = "UNDER_REPAIR"
    RETIRED = "RETIRED"
    LOST = "LOST"


class HardwareSpecs:
    """
    Demonstrates COMPOSITION:
    Hardware specifications are composed inside computing assets.
    """
    def __init__(self, processor: str = "N/A", ram_gb: int = 0, storage_gb: int = 0):
        self.processor = processor
        self.ram_gb = ram_gb
        self.storage_gb = storage_gb

    def to_dict(self) -> Dict[str, Any]:
        return {
            "processor": self.processor,
            "ram_gb": self.ram_gb,
            "storage_gb": self.storage_gb,
        }

    def __repr__(self) -> str:
        return f"Specs(CPU={self.processor}, RAM={self.ram_gb}GB, Disk={self.storage_gb}GB)"


class Asset:
    """
    Base class representing an IT Asset.
    Demonstrates ENCAPSULATION and INHERITANCE.
    """
    def __init__(
        self,
        asset_id: str,
        brand: str,
        model: str,
        serial_number: str,
        purchase_date: Optional[date] = None,
        status: AssetStatus = AssetStatus.AVAILABLE,
        assigned_to: Optional[str] = None
    ):
        if not asset_id or not asset_id.strip():
            raise InvalidAssetError("Asset ID cannot be empty.")
        if not brand or not model:
            raise InvalidAssetError("Brand and Model must be specified.")

        self.asset_id = asset_id.strip()
        self.brand = brand.strip()
        self.model = model.strip()

        # Encapsulation: protected attributes accessed via properties
        self._serial_number = serial_number.strip() if serial_number else ""
        self._status = status
        self._assigned_to = assigned_to
        self.purchase_date = purchase_date or date.today()

    # --- Encapsulation: Getter and Setter for Serial Number ---
    @property
    def serial_number(self) -> str:
        """Serial number getter."""
        return self._serial_number

    @serial_number.setter
    def serial_number(self, value: str):
        if not value or len(value.strip()) < 3:
            raise InvalidAssetError("Serial number must be at least 3 characters long.")
        self._serial_number = value.strip()

    # --- Encapsulation: Status & Assignment Management ---
    @property
    def status(self) -> AssetStatus:
        return self._status

    @property
    def assigned_to(self) -> Optional[str]:
        return self._assigned_to

    def assign_to_employee(self, employee_id: str) -> None:
        """
        Assign asset to an employee.
        Validates current status to prevent illegal state transitions.
        """
        if self._status == AssetStatus.RETIRED:
            raise InvalidStatusTransitionError(f"Cannot assign retired asset '{self.asset_id}'.")
        if self._status == AssetStatus.UNDER_REPAIR:
            raise InvalidStatusTransitionError(f"Asset '{self.asset_id}' is currently under repair.")
        if self._status == AssetStatus.ASSIGNED:
            raise InvalidStatusTransitionError(
                f"Asset '{self.asset_id}' is already assigned to {self._assigned_to}."
            )

        if not employee_id or not employee_id.strip():
            raise InvalidAssetError("Employee ID must be provided for assignment.")

        self._assigned_to = employee_id.strip()
        self._status = AssetStatus.ASSIGNED

    def return_asset(self) -> None:
        """Returns the asset back to available inventory."""
        if self._status != AssetStatus.ASSIGNED:
            raise InvalidStatusTransitionError(
                f"Cannot return asset '{self.asset_id}' because it is currently {self._status.value}."
            )
        self._assigned_to = None
        self._status = AssetStatus.AVAILABLE

    def mark_under_repair(self) -> None:
        """Marks asset as under repair."""
        if self._status == AssetStatus.RETIRED:
            raise InvalidStatusTransitionError("Retired assets cannot be put under repair.")
        self._status = AssetStatus.UNDER_REPAIR

    def retire_asset(self) -> None:
        """Permanently retires an asset."""
        self._assigned_to = None
        self._status = AssetStatus.RETIRED

    def get_asset_type(self) -> str:
        """Returns the specific asset type."""
        return "Generic Asset"

    # Polymorphic method: subclasses override this
    def get_details(self) -> Dict[str, Any]:
        """Polymorphic method to fetch full asset details."""
        return {
            "asset_id": self.asset_id,
            "type": self.get_asset_type(),
            "brand": self.brand,
            "model": self.model,
            "serial_number": self.serial_number,
            "purchase_date": self.purchase_date.isoformat(),
            "status": self.status.value,
            "assigned_to": self.assigned_to,
        }

    def __repr__(self) -> str:
        return f"<{self.get_asset_type()} id={self.asset_id} status={self.status.value}>"


# =====================================================================
# Child Classes Demonstrating INHERITANCE and POLYMORPHISM
# =====================================================================

class Laptop(Asset):
    """
    Laptop child class.
    Inherits from Asset and uses Composition with HardwareSpecs.
    """
    def __init__(
        self,
        asset_id: str,
        brand: str,
        model: str,
        serial_number: str,
        specs: Optional[HardwareSpecs] = None,
        battery_health_percent: int = 100,
        purchase_date: Optional[date] = None,
        status: AssetStatus = AssetStatus.AVAILABLE,
        assigned_to: Optional[str] = None
    ):
        super().__init__(asset_id, brand, model, serial_number, purchase_date, status, assigned_to)
        # Composition: HardwareSpecs is composed inside Laptop
        self.specs = specs or HardwareSpecs()
        self.battery_health_percent = battery_health_percent

    def get_asset_type(self) -> str:
        return "Laptop"

    def get_details(self) -> Dict[str, Any]:
        """Polymorphic override with laptop-specific details."""
        details = super().get_details()
        details.update({
            "hardware_specs": self.specs.to_dict(),
            "battery_health": f"{self.battery_health_percent}%",
        })
        return details


class Monitor(Asset):
    """Monitor child class."""
    def __init__(
        self,
        asset_id: str,
        brand: str,
        model: str,
        serial_number: str,
        screen_size_inches: float = 24.0,
        resolution: str = "1920x1080",
        purchase_date: Optional[date] = None,
        status: AssetStatus = AssetStatus.AVAILABLE,
        assigned_to: Optional[str] = None
    ):
        super().__init__(asset_id, brand, model, serial_number, purchase_date, status, assigned_to)
        self.screen_size_inches = screen_size_inches
        self.resolution = resolution

    def get_asset_type(self) -> str:
        return "Monitor"

    def get_details(self) -> Dict[str, Any]:
        """Polymorphic override with monitor specs."""
        details = super().get_details()
        details.update({
            "screen_size": f"{self.screen_size_inches} inches",
            "resolution": self.resolution,
        })
        return details


class Keyboard(Asset):
    """Keyboard child class."""
    def __init__(
        self,
        asset_id: str,
        brand: str,
        model: str,
        serial_number: str,
        connection_type: str = "Wireless",
        is_mechanical: bool = False,
        purchase_date: Optional[date] = None,
        status: AssetStatus = AssetStatus.AVAILABLE,
        assigned_to: Optional[str] = None
    ):
        super().__init__(asset_id, brand, model, serial_number, purchase_date, status, assigned_to)
        self.connection_type = connection_type
        self.is_mechanical = is_mechanical

    def get_asset_type(self) -> str:
        return "Keyboard"

    def get_details(self) -> Dict[str, Any]:
        details = super().get_details()
        details.update({
            "connection_type": self.connection_type,
            "is_mechanical": self.is_mechanical,
        })
        return details


class Mouse(Asset):
    """Mouse child class."""
    def __init__(
        self,
        asset_id: str,
        brand: str,
        model: str,
        serial_number: str,
        is_wireless: bool = True,
        dpi: int = 1600,
        purchase_date: Optional[date] = None,
        status: AssetStatus = AssetStatus.AVAILABLE,
        assigned_to: Optional[str] = None
    ):
        super().__init__(asset_id, brand, model, serial_number, purchase_date, status, assigned_to)
        self.is_wireless = is_wireless
        self.dpi = dpi

    def get_asset_type(self) -> str:
        return "Mouse"

    def get_details(self) -> Dict[str, Any]:
        details = super().get_details()
        details.update({
            "is_wireless": self.is_wireless,
            "dpi": self.dpi,
        })
        return details


class Printer(Asset):
    """Printer child class."""
    def __init__(
        self,
        asset_id: str,
        brand: str,
        model: str,
        serial_number: str,
        is_color: bool = True,
        technology: str = "Laser",
        purchase_date: Optional[date] = None,
        status: AssetStatus = AssetStatus.AVAILABLE,
        assigned_to: Optional[str] = None
    ):
        super().__init__(asset_id, brand, model, serial_number, purchase_date, status, assigned_to)
        self.is_color = is_color
        self.technology = technology

    def get_asset_type(self) -> str:
        return "Printer"

    def get_details(self) -> Dict[str, Any]:
        details = super().get_details()
        details.update({
            "is_color": self.is_color,
            "technology": self.technology,
        })
        return details


if __name__ == "__main__":
    import json

    print("=" * 60)
    print("RUNNING ASSET MANAGEMENT DEMO (OOP & Polymorphism)")
    print("=" * 60)

    # 1. Create a Laptop with composed HardwareSpecs
    laptop_specs = HardwareSpecs(processor="Intel Core i7-1370P", ram_gb=32, storage_gb=1024)
    laptop = Laptop(
        asset_id="LAP-1023",
        brand="Dell",
        model="Latitude 5440",
        serial_number="ABC12345XYZ",
        specs=laptop_specs,
        battery_health_percent=98
    )

    print("\n[+] Created Laptop Instance:")
    print(json.dumps(laptop.get_details(), indent=2))

    # 2. Assign the Laptop to an Employee
    print("\n[+] Assigning Laptop to EMP-102...")
    laptop.assign_to_employee("EMP-102")
    print(f"Status: {laptop.status.value} | Assigned To: {laptop.assigned_to}")

    # 3. Create a Monitor (Polymorphism)
    monitor = Monitor(
        asset_id="MON-2045",
        brand="Dell",
        model="UltraSharp U2723QE",
        serial_number="MON987654",
        screen_size_inches=27.0,
        resolution="3840x2160 (4K UHD)"
    )

    print("\n[+] Created Monitor Instance (Polymorphic details):")
    print(json.dumps(monitor.get_details(), indent=2))

    # 4. Demonstrate Exception Handling: Try assigning already assigned asset
    print("\n[!] Testing Error Handling (Assigning already assigned asset):")
    try:
        laptop.assign_to_employee("EMP-999")
    except InvalidStatusTransitionError as err:
        print(f"    Caught Expected Exception: {err}")

    # 5. Return the asset
    print("\n[+] Returning Laptop to Inventory...")
    laptop.return_asset()
    print(f"Status: {laptop.status.value} | Assigned To: {laptop.assigned_to}")

    print("\n" + "=" * 60)
    print("ALL ASSET TESTS & OOP DEMOS COMPLETED SUCCESSFULLY!")
    print("=" * 60)

