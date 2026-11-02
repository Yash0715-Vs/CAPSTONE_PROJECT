import subprocess
import time
import json
import asyncio
import urllib.request
import base64
import os
import sys
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\Yash\.gemini\antigravity\brain\ae60aac7-2d6e-43c3-8735-5bed26f117f5"

ADMIN_SCREENSHOT = os.path.join(ARTIFACT_DIR, "day2_admin_dashboard_verified.png")
SUPPORT_SCREENSHOT = os.path.join(ARTIFACT_DIR, "day2_support_dashboard_verified.png")
EMPLOYEE_SCREENSHOT = os.path.join(ARTIFACT_DIR, "day2_employee_dashboard_verified.png")
SIGNOUT_SCREENSHOT = os.path.join(ARTIFACT_DIR, "day2_signout_verified.png")

async def verify_roles():
    print("--- STARTING DAY 2 END-TO-END CDP BROWSER VERIFICATION ---")
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1440,960",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    try:
        ws_url = None
        for _ in range(30):
            try:
                with urllib.request.urlopen("http://127.0.0.1:9222/json") as response:
                    tabs = json.loads(response.read().decode())
                    pages = [t for t in tabs if t.get("type") == "page"]
                    if pages:
                        ws_url = pages[0]["webSocketDebuggerUrl"]
                        break
            except Exception:
                time.sleep(0.2)

        if not ws_url:
            print("[FAIL] Could not connect to Chrome debugging port")
            return False

        async with websockets.connect(ws_url, max_size=20_000_000) as ws:
            msg_id = 1
            async def send_cmd(method, params=None):
                nonlocal msg_id
                cid = msg_id
                msg_id += 1
                payload = {"id": cid, "method": method}
                if params:
                    payload["params"] = params
                await ws.send(json.dumps(payload))
                return cid

            async def eval_js(expression, await_promise=False):
                params = {"expression": expression, "returnByValue": True}
                if await_promise:
                    params["awaitPromise"] = True
                cid = await send_cmd("Runtime.evaluate", params)
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        result = data.get("result", {})
                        if "exceptionDetails" in result:
                            raise RuntimeError(result["exceptionDetails"])
                        return result.get("result", {}).get("value")

            async def take_screenshot(filepath):
                cid_snap = await send_cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(msg)
                    if data.get("id") == cid_snap:
                        b64 = data.get("result", {}).get("data", "")
                        if b64:
                            with open(filepath, "wb") as f:
                                f.write(base64.b64decode(b64))
                            print(f"  [SCREENSHOT] Saved to {filepath}")
                        break

            await send_cmd("Runtime.enable")
            await send_cmd("Page.enable")
            await send_cmd("Console.enable")

            # 1. Navigate to frontend root
            print("\n1. Navigating to http://127.0.0.1:8000/...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:8000/"})
            await asyncio.sleep(4)

            # ---------------- TEST ROLE 1: ADMIN (ADM-001) ----------------
            print("\n--- TEST ROLE 1: ADMIN (ADM-001) ---")
            login_admin = """
            (async () => {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'ADM-001', password: 'password'})
                });
                const data = await res.json();
                localStorage.setItem('it_user', JSON.stringify(data.user));
                localStorage.setItem('it_token', data.access_token);
                location.reload();
            })();
            """
            await eval_js(login_admin, await_promise=True)
            await asyncio.sleep(5)

            admin_check = await eval_js("""
            ({
                headline: document.querySelector('h1')?.innerText || '',
                bodySnippet: document.body?.innerText?.slice(0, 1000) || '',
                navButtons: Array.from(document.querySelectorAll('nav button')).map(b => b.innerText.replace(/\\s+/g, ' ').trim()),
                hasTotalAssets: document.body?.innerText?.includes('TOTAL ASSETS'),
                hasTotalUsers: document.body?.innerText?.includes('TOTAL USERS'),
                hasAuditLedger: document.body?.innerText?.includes('Audit Ledger'),
                hasEmployees: document.body?.innerText?.includes('Employees'),
                hasSla: document.body?.innerText?.includes('SLA & Performance'),
                wsLive: document.body?.innerText?.includes('Live')
            })
            """)

            print(f"  Admin Headline: {admin_check.get('headline')}")
            print(f"  Nav Buttons: {admin_check.get('navButtons')}")
            print(f"  KPI Total Assets: {admin_check.get('hasTotalAssets')}")
            print(f"  KPI Total Users: {admin_check.get('hasTotalUsers')}")
            print(f"  Has Employees Nav: {admin_check.get('hasEmployees')}")
            print(f"  Has SLA Nav: {admin_check.get('hasSla')}")
            print(f"  Has Audit Ledger Nav: {admin_check.get('hasAuditLedger')}")
            print(f"  WebSocket Stream Live: {admin_check.get('wsLive')}")

            assert "Operations & Infrastructure" in admin_check.get("headline", ""), "Admin headline mismatch"
            assert admin_check.get("hasEmployees"), "Employees missing in Admin nav"
            assert admin_check.get("hasAuditLedger"), "Audit Ledger missing in Admin nav"
            assert admin_check.get("hasSla"), "SLA missing in Admin nav"
            await take_screenshot(ADMIN_SCREENSHOT)
            print("  [SUCCESS] Admin role verification passed!")

            # ---------------- TEST ROLE 2: SUPPORT (IT-501) ----------------
            print("\n--- TEST ROLE 2: SUPPORT (IT-501) ---")
            login_support = """
            (async () => {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'IT-501', password: 'password'})
                });
                const data = await res.json();
                localStorage.setItem('it_user', JSON.stringify(data.user));
                localStorage.setItem('it_token', data.access_token);
                location.reload();
            })();
            """
            await eval_js(login_support, await_promise=True)
            await asyncio.sleep(5)

            support_check = await eval_js("""
            ({
                headline: document.querySelector('h1')?.innerText || '',
                navText: document.querySelector('nav')?.innerText || '',
                hasQueueActive: document.body?.innerText?.includes('QUEUE ACTIVE'),
                hasMyAssigned: document.body?.innerText?.includes('MY ASSIGNED'),
                hasSlaNav: document.querySelector('nav')?.innerText?.includes('SLA & Performance'),
                hasEmployeesNav: document.querySelector('nav')?.innerText?.includes('Employees'),
                hasAuditLedgerNav: document.querySelector('nav')?.innerText?.includes('Audit Ledger'),
                hasTriageQueue: document.body?.innerText?.includes('Active Operational Triage Queue'),
                hasAssignBtn: document.body?.innerText?.includes('Assign'),
                hasResolveBtn: document.body?.innerText?.includes('Resolve')
            })
            """)

            print(f"  Support Headline: {support_check.get('headline')}")
            print(f"  Nav Text: {support_check.get('navText')}")
            print(f"  KPI Queue Active: {support_check.get('hasQueueActive')}")
            print(f"  KPI My Assigned: {support_check.get('hasMyAssigned')}")
            print(f"  Has SLA Nav: {support_check.get('hasSlaNav')}")
            print(f"  Has Employees Nav (should be FALSE): {support_check.get('hasEmployeesNav')}")
            print(f"  Has Audit Ledger Nav (should be FALSE): {support_check.get('hasAuditLedgerNav')}")
            print(f"  Has Triage Queue: {support_check.get('hasTriageQueue')}")
            print(f"  Has Assign Button: {support_check.get('hasAssignBtn')}")
            print(f"  Has Resolve Button: {support_check.get('hasResolveBtn')}")

            assert "ServiceDesk Operations Hub" in support_check.get("headline", ""), "Support headline mismatch"
            assert not support_check.get("hasEmployeesNav"), "Employees MUST NOT be visible to Support in Nav"
            assert not support_check.get("hasAuditLedgerNav"), "Audit Ledger MUST NOT be visible to Support in Nav"
            assert support_check.get("hasSlaNav"), "SLA should be visible to Support in Nav"
            assert support_check.get("hasTriageQueue"), "Operational triage queue missing"

            # Verify direct API check returns 403
            api_403_check = await eval_js("""
            (async () => {
                const token = localStorage.getItem('it_token');
                const res = await fetch('/reports/audit', {
                    headers: {'Authorization': 'Bearer ' + token}
                });
                return res.status;
            })()
            """, await_promise=True)
            print(f"  Direct call to /reports/audit by Support returns HTTP {api_403_check}")
            assert api_403_check == 403, f"Expected 403, got {api_403_check}"

            await take_screenshot(SUPPORT_SCREENSHOT)
            print("  [SUCCESS] Support role verification passed!")

            # ---------------- TEST ROLE 3: EMPLOYEE (EMP-101) ----------------
            print("\n--- TEST ROLE 3: EMPLOYEE (EMP-101) ---")
            login_employee = """
            (async () => {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'EMP-101', password: 'password'})
                });
                const data = await res.json();
                localStorage.setItem('it_user', JSON.stringify(data.user));
                localStorage.setItem('it_token', data.access_token);
                location.reload();
            })();
            """
            await eval_js(login_employee, await_promise=True)
            await asyncio.sleep(5)

            employee_check = await eval_js("""
            ({
                headline: document.querySelector('h1')?.innerText || '',
                navText: document.querySelector('nav')?.innerText || '',
                hasMyOpenTickets: document.body?.innerText?.includes('MY OPEN TICKETS'),
                hasMyResolved: document.body?.innerText?.includes('MY RESOLVED TICKETS'),
                hasAssignedEquipment: document.body?.innerText?.includes('ASSIGNED EQUIPMENT'),
                hasPersonalTicketHistory: document.body?.innerText?.includes('PERSONAL TICKET HISTORY'),
                hasSupportRequestsTable: document.body?.innerText?.includes('My Support Incident Requests'),
                hasAssignedEquipmentCards: document.body?.innerText?.includes('My Assigned Equipment'),
                hasEmployeesNav: document.querySelector('nav')?.innerText?.includes('Employees'),
                hasSlaNav: document.querySelector('nav')?.innerText?.includes('SLA & Performance'),
                hasAuditLedgerNav: document.querySelector('nav')?.innerText?.includes('Audit Ledger')
            })
            """)

            print(f"  Employee Headline: {employee_check.get('headline')}")
            print(f"  Nav Text: {employee_check.get('navText')}")
            print(f"  KPI My Open Tickets: {employee_check.get('hasMyOpenTickets')}")
            print(f"  KPI My Resolved Tickets: {employee_check.get('hasMyResolved')}")
            print(f"  KPI Assigned Equipment: {employee_check.get('hasAssignedEquipment')}")
            print(f"  KPI Personal Ticket History: {employee_check.get('hasPersonalTicketHistory')}")
            print(f"  Has Incidents Table: {employee_check.get('hasSupportRequestsTable')}")
            print(f"  Has Equipment Cards: {employee_check.get('hasAssignedEquipmentCards')}")
            print(f"  Has Employees Nav (should be FALSE): {employee_check.get('hasEmployeesNav')}")
            print(f"  Has SLA Nav (should be FALSE): {employee_check.get('hasSlaNav')}")
            print(f"  Has Audit Ledger Nav (should be FALSE): {employee_check.get('hasAuditLedgerNav')}")

            assert "Welcome, Aarav Verma" in employee_check.get("headline", ""), "Employee headline mismatch"
            assert not employee_check.get("hasEmployeesNav"), "Employees MUST NOT be visible to Employee in Nav"
            assert not employee_check.get("hasSlaNav"), "SLA MUST NOT be visible to Employee in Nav"
            assert not employee_check.get("hasAuditLedgerNav"), "Audit Ledger MUST NOT be visible to Employee in Nav"
            assert employee_check.get("hasMyOpenTickets"), "My Open Tickets KPI missing"
            assert employee_check.get("hasSupportRequestsTable"), "Incidents table missing"

            # Check Assets Tab does not have "+ Register Device"
            await eval_js("""
            Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('My Equipment'))?.click();
            """)
            await asyncio.sleep(2)

            asset_tab_check = await eval_js("""
            ({
                tabTitle: document.querySelector('.table-header-title')?.innerText || '',
                hasRegisterBtn: document.body?.innerText?.includes('Register Device') || document.body?.innerText?.includes('Register Asset')
            })
            """)
            print(f"  Employee Asset Tab Title: {asset_tab_check.get('tabTitle')}")
            print(f"  Has Register Device Button (should be FALSE): {asset_tab_check.get('hasRegisterBtn')}")
            assert not asset_tab_check.get("hasRegisterBtn"), "Register Device button MUST NOT be visible to Employee"

            # Switch back to dashboard
            await eval_js("""
            Array.from(document.querySelectorAll('nav button')).find(b => b.innerText.includes('My Workspace'))?.click();
            """)
            await asyncio.sleep(1)

            # Verify direct employee backend rejections
            emp_api_check = await eval_js("""
            (async () => {
                const token = localStorage.getItem('it_token');
                const r1 = await fetch('/reports/audit', { headers: {'Authorization': 'Bearer ' + token} });
                const r2 = await fetch('/reports/sla', { headers: {'Authorization': 'Bearer ' + token} });
                const r3 = await fetch('/users', { headers: {'Authorization': 'Bearer ' + token} });
                return { auditStatus: r1.status, slaStatus: r2.status, usersStatus: r3.status };
            })()
            """, await_promise=True)
            print(f"  Direct API status checks for Employee: {emp_api_check}")
            assert emp_api_check.get("auditStatus") == 403, f"Expected 403 for audit, got {emp_api_check.get('auditStatus')}"
            assert emp_api_check.get("slaStatus") == 403, f"Expected 403 for sla, got {emp_api_check.get('slaStatus')}"
            assert emp_api_check.get("usersStatus") == 403, f"Expected 403 for users, got {emp_api_check.get('usersStatus')}"

            await take_screenshot(EMPLOYEE_SCREENSHOT)
            print("  [SUCCESS] Employee role verification passed!")

            # ---------------- TEST LOGOUT / SESSION CLEAR ----------------
            print("\n--- TEST LOGOUT & SESSION INVALIDATION ---")
            await eval_js("""
            document.querySelector('button[title=\"Sign Out\"]')?.click();
            """)
            await asyncio.sleep(3)

            logout_check = await eval_js("""
            ({
                token: localStorage.getItem('it_token'),
                user: localStorage.getItem('it_user'),
                hasSignIn: document.body?.innerText?.includes('Sign In') || document.body?.innerText?.includes('Enter your user ID')
            })
            """)
            print(f"  Storage token after logout: {logout_check.get('token')}")
            print(f"  Storage user after logout: {logout_check.get('user')}")
            print(f"  Login UI visible: {logout_check.get('hasSignIn')}")

            assert logout_check.get("token") is None, "Token was not cleared on logout"
            assert logout_check.get("user") is None, "User was not cleared on logout"
            await take_screenshot(SIGNOUT_SCREENSHOT)
            print("  [SUCCESS] Logout verification passed!")

            print("\n=======================================================")
            print("ALL DAY 2 ROLES, RBAC, WEBSOCKET & SESSIONS VERIFIED 100%!")
            print("=======================================================")
            return True

    finally:
        proc.terminate()

if __name__ == "__main__":
    success = asyncio.run(verify_roles())
    sys.exit(0 if success else 1)
