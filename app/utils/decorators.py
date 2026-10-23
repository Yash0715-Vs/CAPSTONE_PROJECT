"""
Custom Application Decorators.

Meets Capstone Specification Section 10:
- @measure_execution_time: Profiles and logs function execution runtime
- @log_activity: Logs invocation details and parameters
- @login_required: Enforces authentication check
- @admin_required: Enforces administrator role check
Demonstrates adding reusable cross-cutting concerns without code duplication.
"""

import sys
import time
import functools
import logging
from pathlib import Path
from typing import Callable, Any

# Ensure project root is in sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.utils.exceptions import ITAssetBaseException

# Configure basic logger for decorators
logger = logging.getLogger("app.decorators")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")


def measure_execution_time(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator that calculates and displays how long a function takes to execute.
    Useful for profiling database queries, report generation, and external API calls.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.perf_counter()
        try:
            return func(*args, **kwargs)
        finally:
            elapsed = time.perf_counter() - start_time
            print(f"[TIME] '{func.__name__}' executed in {elapsed * 1000:.2f} ms")
    return wrapper


def log_activity(action_name: str = "") -> Callable[..., Any]:
    """
    Decorator that logs an administrative or business activity.
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            action = action_name or func.__name__
            print(f"[LOG] Initiating activity: {action} with args={args[1:] if len(args) > 1 else 'None'}")
            try:
                result = func(*args, **kwargs)
                print(f"[LOG] Activity '{action}' completed successfully.")
                return result
            except Exception as err:
                print(f"[LOG ERROR] Activity '{action}' failed: {err}")
                raise
        return wrapper
    return decorator


def login_required(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator that verifies if the user context is authenticated.
    Expects a 'current_user' dict or object passed in kwargs or positional args.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        current_user = kwargs.get("current_user")
        if not current_user and len(args) > 0 and isinstance(args[0], dict) and "username" in args[0]:
            current_user = args[0]

        if not current_user:
            raise PermissionError("Authentication required: Please log in to perform this operation.")
        return func(*args, **kwargs)
    return wrapper


def admin_required(func: Callable[..., Any]) -> Callable[..., Any]:
    """
    Decorator that restricts function execution strictly to users with the 'ADMIN' role.
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        current_user = kwargs.get("current_user")
        if not current_user and len(args) > 0 and isinstance(args[0], dict) and "role" in args[0]:
            current_user = args[0]

        if not current_user:
            raise PermissionError("Access Denied: Authentication required.")

        user_role = current_user.get("role") if isinstance(current_user, dict) else getattr(current_user, "role", None)
        if str(user_role).upper() != "ADMIN":
            raise PermissionError(f"Access Denied: Administrator role required (current role: {user_role}).")

        return func(*args, **kwargs)
    return wrapper


if __name__ == "__main__":
    print("=" * 65)
    print("RUNNING CUSTOM DECORATORS DEMONSTRATION")
    print("=" * 65)

    # 1. Test @measure_execution_time
    @measure_execution_time
    def simulate_heavy_report_query():
        print("  Processing 10,000 data records...")
        time.sleep(0.05)  # Simulate 50ms processing
        return "Report Generated"

    print("\n[+] Testing @measure_execution_time:")
    simulate_heavy_report_query()

    # 2. Test @log_activity
    @log_activity(action_name="Assign Asset to Employee")
    def assign_device(asset_id: str, emp_id: str):
        return f"Device {asset_id} successfully mapped to {emp_id}"

    print("\n[+] Testing @log_activity:")
    assign_device("LAP-102", "EMP-450")

    # 3. Test @admin_required with Authorized Admin
    @admin_required
    def delete_asset(asset_id: str, current_user: dict):
        return f"Asset {asset_id} deleted."

    admin_user = {"username": "alice_admin", "role": "ADMIN"}
    employee_user = {"username": "bob_emp", "role": "EMPLOYEE"}

    print("\n[+] Testing @admin_required with ADMIN user:")
    result = delete_asset("LAP-999", current_user=admin_user)
    print(f"  Result: {result}")

    # 4. Test @admin_required with Unauthorized Non-Admin
    print("\n[!] Testing @admin_required with EMPLOYEE user (Unauthorized):")
    try:
        delete_asset("LAP-999", current_user=employee_user)
    except PermissionError as err:
        print(f"  Caught Expected PermissionError: {err}")

    print("\n" + "=" * 65)
    print("ALL DECORATOR TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 65)
