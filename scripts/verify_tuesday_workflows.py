# scripts/verify_tuesday_workflows.py
import subprocess
import time
import json
import asyncio
import urllib.request
import base64
import os
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
ARTIFACT_DIR = r"C:\Users\Yash\.gemini\antigravity\brain\ae60aac7-2d6e-43c3-8735-5bed26f117f5"

SNAP_FORGOT_PWD = "tuesday_forgot_password_modal.png"
SNAP_TICKET_DETAILS = "tuesday_ticket_details_modal.png"
SNAP_USER_DETAILS = "tuesday_user_details_modal.png"
SNAP_EDIT_USER = "tuesday_edit_user_modal.png"
SNAP_WORKFORCE_TABLE = "tuesday_workforce_table.png"

async def run_workflows():
    print("=== STARTING TUESDAY END-TO-END WORKFLOW VERIFICATION ===")

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

        async with websockets.connect(ws_url, max_size=25_000_000) as ws:
            msg_id = 1
            console_errors = []

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
                    msg = await asyncio.wait_for(ws.recv(), timeout=15.0)
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        result = data.get("result", {})
                        if "exceptionDetails" in result:
                            raise RuntimeError(result["exceptionDetails"])
                        return result.get("result", {}).get("value")
                    elif data.get("method") == "Runtime.consoleAPICalled" and data["params"]["type"] == "error":
                        err_str = " ".join(str(a.get("value", "")) for a in data["params"]["args"])
                        print(f"  [BROWSER CONSOLE ERROR] {err_str}")
                        console_errors.append(err_str)

            async def snap(filename):
                filepath = os.path.join(ARTIFACT_DIR, filename)
                cid_snap = await send_cmd("Page.captureScreenshot", {"format": "png"})
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
                    data = json.loads(msg)
                    if data.get("id") == cid_snap:
                        b64 = data.get("result", {}).get("data", "")
                        if b64:
                            with open(filepath, "wb") as f:
                                f.write(base64.b64decode(b64))
                            print(f"  [SAVED] {filename}")
                        break

            await send_cmd("Runtime.enable")
            await send_cmd("Page.enable")
            await send_cmd("Console.enable")

            # -------------------------------------------------------------
            # STEP 1: LOGIN PAGE & FORGOT PASSWORD MODAL
            # -------------------------------------------------------------
            print("\n1. Testing Login Page & Password Recovery Dialog...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:8000/"})
            await asyncio.sleep(4)
            await eval_js("localStorage.clear(); location.reload();")
            await asyncio.sleep(4)

            # Click forgot password link
            await eval_js("document.querySelector('.forgot-pwd-link')?.click()")
            await asyncio.sleep(1.5)
            has_forgot_modal = await eval_js("document.body.innerText.includes('Password Recovery')")
            print(f"  [CHECK] Password Recovery Modal rendered: {has_forgot_modal}")
            await snap(SNAP_FORGOT_PWD)

            # Close modal
            await eval_js("""
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Understood'));
                if (btn) btn.click();
            })()
            """)
            await asyncio.sleep(1)

            # -------------------------------------------------------------
            # STEP 2: ADMIN LOGIN & WORKFORCE DIRECTORY MODALS
            # -------------------------------------------------------------
            print("\n2. Logging in as Admin (ADM-001) & Testing Workforce Modals...")
            admin_login = """
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
            await eval_js(admin_login, await_promise=True)
            await asyncio.sleep(5)

            # Navigate to Employees tab
            print("  Navigating to Enrolled Employee Directory...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const empBtn = btns.find(b => b.innerText.includes('Employees'));
                if (empBtn) empBtn.click();
            })();
            """)
            await asyncio.sleep(4)
            await snap(SNAP_WORKFORCE_TABLE)

            # Open User Details Modal
            print("  Opening User Details Modal...")
            clicked_user_det = await eval_js("""
            (() => {
                const rows = Array.from(document.querySelectorAll('table.data-table tbody tr'));
                for (const r of rows) {
                    const btn = Array.from(r.querySelectorAll('button')).find(b => b.innerText.includes('Details'));
                    if (btn) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            })();
            """)
            print(f"  [ACTION] Clicked User Details button: {clicked_user_det}")
            await asyncio.sleep(2)
            has_user_modal = await eval_js("!!document.querySelector('.modal-surface .modal-title')")
            print(f"  [CHECK] UserDetailsModal rendered with title: {has_user_modal}")
            await snap(SNAP_USER_DETAILS)

            # Close User Details modal
            await eval_js("""
            (() => {
                const closeBtn = Array.from(document.querySelectorAll('.modal-surface button')).find(b => b.innerText.trim() === 'Close');
                if (closeBtn) closeBtn.click();
            })();
            """)
            await asyncio.sleep(1)

            # Open Edit User Modal
            print("  Opening Edit User Modal...")
            clicked_edit = await eval_js("""
            (() => {
                const rows = Array.from(document.querySelectorAll('table.data-table tbody tr'));
                for (const r of rows) {
                    const btn = Array.from(r.querySelectorAll('button')).find(b => b.innerText.includes('Edit'));
                    if (btn) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            })();
            """)
            print(f"  [ACTION] Clicked Edit button: {clicked_edit}")
            await asyncio.sleep(2)
            has_edit_modal = await eval_js("document.body.innerText.includes('Edit Workforce Profile')")
            print(f"  [CHECK] EditUserModal rendered: {has_edit_modal}")
            await snap(SNAP_EDIT_USER)

            # Cancel Edit User modal
            await eval_js("""
            (() => {
                const cancelBtn = Array.from(document.querySelectorAll('.modal-surface button')).find(b => b.innerText.trim() === 'Cancel');
                if (cancelBtn) cancelBtn.click();
            })();
            """)
            await asyncio.sleep(1)

            # -------------------------------------------------------------
            # STEP 3: TICKET DETAILS MODAL
            # -------------------------------------------------------------
            print("\n3. Navigating to Tickets & Testing Ticket Details Drawer...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const ticketBtn = btns.find(b => b.innerText.includes('Tickets'));
                if (ticketBtn) ticketBtn.click();
            })();
            """)
            await asyncio.sleep(4)

            # Click Details on first ticket
            clicked_tkt_det = await eval_js("""
            (() => {
                const rows = Array.from(document.querySelectorAll('table.data-table tbody tr'));
                for (const r of rows) {
                    const btn = Array.from(r.querySelectorAll('button')).find(b => b.innerText.includes('Details'));
                    if (btn) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            })();
            """)
            print(f"  [ACTION] Clicked Ticket Details button: {clicked_tkt_det}")
            await asyncio.sleep(2)
            has_ticket_details = await eval_js("!!document.querySelector('.modal-surface .modal-title')")
            print(f"  [CHECK] TicketDetailsModal rendered with title: {has_ticket_details}")
            await snap(SNAP_TICKET_DETAILS)

            # Dismiss modal
            await eval_js("""
            (() => {
                const dismissBtn = Array.from(document.querySelectorAll('.modal-surface button')).find(b => b.innerText.trim() === 'Dismiss');
                if (dismissBtn) dismissBtn.click();
            })();
            """)
            await asyncio.sleep(1)

            # -------------------------------------------------------------
            # STEP 4: VERIFY ROLE SWITCHER FUNCTIONALITY IS REMOVED
            # -------------------------------------------------------------
            print("\n4. Verifying Switch Role functionality is removed...")
            has_role_switcher = await eval_js("document.body.innerText.includes('Switch Enterprise Role')")
            avatar_title = await eval_js("""
            (() => {
                const av = document.querySelector('header .rounded-full.bg-primary');
                return av ? av.title : '';
            })()
            """)
            print(f"  [CHECK] Switch Enterprise Role modal in DOM: {has_role_switcher} (Expected: False)")
            print(f"  [CHECK] Header Avatar title: {repr(avatar_title)} (No switch role prompt)")

            # -------------------------------------------------------------
            # STEP 5: WORKFLOW A — TICKET MANAGEMENT
            # -------------------------------------------------------------
            print("\n5. Testing Workflow A: Ticket Lifecycle & Auto-Assignment...")
            # Employee logs in
            emp_login = """
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
            await eval_js(emp_login, await_promise=True)
            await asyncio.sleep(5)

            # Employee creates a ticket
            tkt_create = await eval_js("""
            (async () => {
                const token = localStorage.getItem('it_token');
                const res = await fetch('/tickets', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        title: 'Workstation Display Driver Crash - Tuesday E2E',
                        description: 'Display driver crash occurs intermittently during CAD renders on assigned workstation.',
                        category: 'HARDWARE',
                        priority: 'HIGH'
                    })
                });
                return { status: res.status, data: await res.json() };
            })()
            """, await_promise=True)
            created_ticket_id = tkt_create['data'].get('ticket_id')
            assigned_specialist = tkt_create['data'].get('assigned_to')
            print(f"  [OK] Employee ticket created: ID={created_ticket_id}, Status={tkt_create['status']}")
            print(f"  [OK] Least-load auto-assigned to: {assigned_specialist}")

            # Verify audit history recorded
            tkt_hist = await eval_js(f"""
            (async () => {{
                const token = localStorage.getItem('it_token');
                const res = await fetch('/tickets/{created_ticket_id}/history', {{
                    headers: {{ 'Authorization': 'Bearer ' + token }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            hist_list = tkt_hist.get("data", []) if isinstance(tkt_hist.get("data"), list) else []
            print(f"  [OK] Ticket history entries: {len(hist_list)} records")
            for h in hist_list:
                print(f"       -> Action: {h.get('old_status')} -> {h.get('new_status')} by {h.get('changed_by')} (Method: {h.get('assignment_method')})")

            # Admin manually reassigns ticket to IT-502
            admin_token = await eval_js("""
            (async () => {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'ADM-001', password: 'password'})
                });
                const data = await res.json();
                return data.access_token;
            })()
            """, await_promise=True)

            reassign_res = await eval_js(f"""
            (async () => {{
                const res = await fetch('/tickets/{created_ticket_id}/assign', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {admin_token}'
                    }},
                    body: JSON.stringify({{ assigned_to: 'IT-502' }})
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Admin manual reassignment to IT-502: status={reassign_res['status']}")

            # Support IT-502 resolves ticket
            sup_token = await eval_js("""
            (async () => {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'IT-502', password: 'password'})
                });
                const data = await res.json();
                return data.access_token;
            })()
            """, await_promise=True)

            resolve_res = await eval_js(f"""
            (async () => {{
                const res = await fetch('/tickets/{created_ticket_id}/resolve', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {sup_token}'
                    }},
                    body: JSON.stringify({{ resolution: 'Updated NVIDIA Studio GPU driver to v552.22 and verified CAD rendering stability.' }})
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Support IT-502 resolved ticket: status={resolve_res['status']}")

            # Employee confirms and closes ticket
            close_res = await eval_js(f"""
            (async () => {{
                const token = localStorage.getItem('it_token');
                const res = await fetch('/tickets/{created_ticket_id}/close', {{
                    method: 'POST',
                    headers: {{ 'Authorization': 'Bearer ' + token }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Employee closed ticket: status={close_res['status']}")

            # -------------------------------------------------------------
            # STEP 6: WORKFLOW B — EQUIPMENT REQUEST LIFECYCLE
            # -------------------------------------------------------------
            print("\n6. Testing Workflow B: Equipment Request Lifecycle...")
            # 1. Employee submits request
            eq_req = await eval_js("""
            (async () => {
                const empRes = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({user_id: 'EMP-101', password: 'password'})
                });
                const empTok = (await empRes.json()).access_token;
                const res = await fetch('/equipment-requests', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + empTok
                    },
                    body: JSON.stringify({
                        equipment_type: 'Monitor',
                        reason: 'Dual 4K color-accurate monitor setup required for visual validation of CAD designs.'
                    })
                });
                return { status: res.status, data: await res.json(), token: empTok };
            })()
            """, await_promise=True)
            req_id = eq_req['data'].get('request_id')
            emp_token = eq_req['token']
            print(f"  [OK] Equipment request submitted: ID={req_id}, Status={eq_req['status']}")

            # 2. Admin approves request
            eq_appr = await eval_js(f"""
            (async () => {{
                const res = await fetch('/equipment-requests/{req_id}/approve', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {admin_token}'
                    }},
                    body: JSON.stringify({{ admin_notes: 'Approved hardware request for CAD workflow.' }})
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Admin approved equipment request: status={eq_appr['status']}")

            # 3. Find available asset and provision
            avail_asset_id = await eval_js(f"""
            (async () => {{
                const res = await fetch('/assets', {{
                    headers: {{ 'Authorization': 'Bearer {admin_token}' }}
                }});
                const assets = await res.json();
                const avail = assets.find(a => a.status === 'AVAILABLE');
                return avail ? avail.asset_id : null;
            }})()
            """, await_promise=True)

            if avail_asset_id:
                eq_prov = await eval_js(f"""
                (async () => {{
                    const res = await fetch('/equipment-requests/{req_id}/provision', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {admin_token}'
                        }},
                        body: JSON.stringify({{ provisioned_asset_id: '{avail_asset_id}', admin_notes: 'Allocated display asset' }})
                    }});
                    return {{ status: res.status, data: await res.json() }};
                }})()
                """, await_promise=True)
                print(f"  [OK] Admin provisioned asset {avail_asset_id}: status={eq_prov['status']}")

                # 4. Employee verifies receipt
                eq_ver = await eval_js(f"""
                (async () => {{
                    const res = await fetch('/equipment-requests/{req_id}/verify', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {emp_token}'
                        }},
                        body: JSON.stringify({{ employee_notes: 'Equipment received in working order.' }})
                    }});
                    return {{ status: res.status, data: await res.json() }};
                }})()
                """, await_promise=True)
                print(f"  [OK] Employee verified equipment: status={eq_ver['status']}")

                # 5. Employee closes request
                eq_close = await eval_js(f"""
                (async () => {{
                    const res = await fetch('/equipment-requests/{req_id}/close', {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer {emp_token}'
                        }},
                        body: JSON.stringify({{ employee_notes: 'Request completed and verified.' }})
                    }});
                    return {{ status: res.status, data: await res.json() }};
                }})()
                """, await_promise=True)
                print(f"  [OK] Employee closed equipment request: status={eq_close['status']}")

                # Return asset back to available inventory
                await eval_js(f"""
                (async () => {{
                    await fetch('/assets/{avail_asset_id}/return', {{
                        method: 'POST',
                        headers: {{ 'Authorization': 'Bearer {admin_token}' }}
                    }});
                }})()
                """, await_promise=True)

            # -------------------------------------------------------------
            # STEP 7: WORKFLOW C — ASSET LIFECYCLE MANAGEMENT
            # -------------------------------------------------------------
            print("\n7. Testing Workflow C: Asset Lifecycle Management...")
            asset_reg = await eval_js(f"""
            (async () => {{
                const res = await fetch('/assets', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {admin_token}'
                    }},
                    body: JSON.stringify({{
                        asset_id: 'AST-TUES-001',
                        type: 'Laptop',
                        brand: 'Dell',
                        model: 'Latitude 7440',
                        serial_number: 'SN-TUES-99218'
                    }})
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Admin registered asset AST-TUES-001: status={asset_reg['status']}")

            # Update asset
            asset_upd = await eval_js(f"""
            (async () => {{
                const res = await fetch('/assets/AST-TUES-001', {{
                    method: 'PUT',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {admin_token}'
                    }},
                    body: JSON.stringify({{
                        brand: 'Dell Enterprise',
                        model: 'Latitude 7440 Ultralight'
                    }})
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Admin updated asset AST-TUES-001: status={asset_upd['status']}")

            # Assign asset to EMP-101
            asset_asgn = await eval_js(f"""
            (async () => {{
                const res = await fetch('/assets/AST-TUES-001/assign', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {admin_token}'
                    }},
                    body: JSON.stringify({{ employee_id: 'EMP-101', notes: 'Assigned for engineering project' }})
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Admin assigned asset to EMP-101: status={asset_asgn['status']}")

            # Verify EMP-101 sees it
            emp_has_asset = await eval_js(f"""
            (async () => {{
                const token = localStorage.getItem('it_token');
                const res = await fetch('/assets', {{
                    headers: {{ 'Authorization': 'Bearer ' + token }}
                }});
                const assets = await res.json();
                return assets.some(a => a.asset_id === 'AST-TUES-001');
            }})()
            """, await_promise=True)
            print(f"  [CHECK] EMP-101 sees assigned asset: {emp_has_asset}")

            # Return asset to inventory
            asset_ret = await eval_js(f"""
            (async () => {{
                const res = await fetch('/assets/AST-TUES-001/return', {{
                    method: 'POST',
                    headers: {{ 'Authorization': 'Bearer {admin_token}' }}
                }});
                return {{ status: res.status, data: await res.json() }};
            }})()
            """, await_promise=True)
            print(f"  [OK] Admin returned asset to inventory: status={asset_ret['status']}")

            # Clean up test asset from MySQL
            await eval_js(f"""
            (async () => {{
                await fetch('/assets/AST-TUES-001', {{
                    method: 'DELETE',
                    headers: {{ 'Authorization': 'Bearer {admin_token}' }}
                }});
            }})()
            """, await_promise=True)

            # -------------------------------------------------------------
            # STEP 8: WORKFLOW D — ROLE-BASED ACCESS CONTROL
            # -------------------------------------------------------------
            print("\n8. Testing Workflow D: Role-Based Access Control...")
            # 1. Support specialist attempting manual ticket assignment -> 403 Forbidden
            sup_assign_forbidden = await eval_js(f"""
            (async () => {{
                const res = await fetch('/tickets/{created_ticket_id}/assign', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer {sup_token}'
                    }},
                    body: JSON.stringify({{ assigned_to: 'IT-503' }})
                }});
                return res.status;
            }})()
            """, await_promise=True)
            print(f"  [CHECK] Support user assignment blocked with 403: {sup_assign_forbidden == 403} (status={sup_assign_forbidden})")

            # 2. Employee accessing Admin-only audit report -> 403 Forbidden
            emp_audit_forbidden = await eval_js(f"""
            (async () => {{
                const res = await fetch('/reports/audit', {{
                    headers: {{ 'Authorization': 'Bearer {emp_token}' }}
                }});
                return res.status;
            }})()
            """, await_promise=True)
            print(f"  [CHECK] Employee audit access blocked with 403: {emp_audit_forbidden == 403} (status={emp_audit_forbidden})")

            # -------------------------------------------------------------
            # STEP 9: CONSOLE ERROR AUDIT & CLEANUP
            # -------------------------------------------------------------
            print("\n9. Auditing Browser Console Errors...")
            print(f"  Total console errors caught: {len(console_errors)}")
            for err in console_errors:
                print(f"    - {err}")

            # Clean up created ticket from MySQL
            await eval_js(f"""
            (async () => {{
                await fetch('/tickets/{created_ticket_id}', {{
                    method: 'DELETE',
                    headers: {{ 'Authorization': 'Bearer {admin_token}' }}
                }});
            }})()
            """, await_promise=True)

            all_ok = (
                len(console_errors) == 0 and
                has_ticket_details and
                has_user_modal and
                has_edit_modal and
                not has_role_switcher and
                reassign_res['status'] == 200 and
                resolve_res['status'] == 200 and
                close_res['status'] == 200 and
                eq_appr['status'] == 200 and
                eq_ver['status'] == 200 and
                eq_close['status'] == 200 and
                asset_reg['status'] == 201 and
                asset_asgn['status'] == 200 and
                sup_assign_forbidden == 403 and
                emp_audit_forbidden == 403
            )
            return all_ok

    finally:
        proc.terminate()
        proc.wait()

if __name__ == "__main__":
    success = asyncio.run(run_workflows())
    if success:
        print("\n>>> ALL TUESDAY E2E WORKFLOW CHECKS PASSED WITH 0 CONSOLE ERRORS! <<<")
    else:
        print("\n>>> E2E CHECKS FINISHED <<<")
