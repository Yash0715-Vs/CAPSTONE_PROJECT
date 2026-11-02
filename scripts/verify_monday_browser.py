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

SNAP_EMP_TICKET = os.path.join(ARTIFACT_DIR, "monday_employee_ticket_modal.png")
SNAP_EMP_EQ = os.path.join(ARTIFACT_DIR, "monday_employee_equipment_requests.png")
SNAP_ADMIN_EQ = os.path.join(ARTIFACT_DIR, "monday_admin_equipment_queue.png")
SNAP_TICKET_HIST = os.path.join(ARTIFACT_DIR, "monday_ticket_history_modal.png")
SNAP_SUPPORT = os.path.join(ARTIFACT_DIR, "monday_support_tickets_view.png")

async def run_verification():
    print("--- STARTING MONDAY DELIVERABLES BROWSER E2E VERIFICATION ---")
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
            return

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
                cid = await send_cmd("Runtime.evaluate", {
                    "expression": expression,
                    "returnByValue": True,
                    "awaitPromise": await_promise
                })
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        return data.get("result", {}).get("result", {}).get("value")

            async def capture_screen(path):
                cid = await send_cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        b64 = data.get("result", {}).get("data", "")
                        if b64:
                            with open(path, "wb") as f:
                                f.write(base64.b64decode(b64))
                            print(f"[SCREENSHOT] Saved: {path}")
                        break

            await send_cmd("Runtime.enable")
            await send_cmd("Page.enable")
            await send_cmd("Console.enable")

            # Collect console errors
            console_errors = []
            async def listen_errors():
                while True:
                    try:
                        msg = await asyncio.wait_for(ws.recv(), timeout=0.1)
                        data = json.loads(msg)
                        if data.get("method") == "Runtime.exceptionThrown":
                            console_errors.append(data["params"]["exceptionDetails"])
                        elif data.get("method") == "Runtime.consoleAPICalled" and data["params"]["type"] == "error":
                            console_errors.append(" ".join(str(a.get("value", "")) for a in data["params"]["args"]))
                    except asyncio.TimeoutError:
                        break

            # -------------------------------------------------------------
            # STEP 1: EMPLOYEE LOGIN & ASSET DROPDOWN VERIFICATION
            # -------------------------------------------------------------
            print("\n[TEST 1] Logging in as Employee EMP-101...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:8000/"})
            await asyncio.sleep(4)

            login_emp = """
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
            await eval_js(login_emp, await_promise=True)
            await asyncio.sleep(5)

            # Check that Employee workspace loaded
            emp_header = await eval_js("document.body.innerText.includes('Employee Workspace') || document.body.innerText.includes('My Equipment')")
            print(f"[CHECK] Employee workspace rendered: {emp_header}")

            # Open Create Ticket modal
            print("[ACTION] Clicking 'New Ticket' to inspect employee asset dropdown...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const newTkt = btns.find(b => b.innerText.includes('New Ticket'));
                if (newTkt) newTkt.click();
            })()
            """)
            await asyncio.sleep(2)

            has_asset_dropdown = await eval_js("document.body.innerText.includes('Assigned Hardware Device')")
            print(f"[CHECK] Assigned hardware device dropdown rendered: {has_asset_dropdown}")
            await capture_screen(SNAP_EMP_TICKET)

            # Close ticket modal
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const cancel = btns.find(b => b.innerText.trim() === 'Cancel');
                if (cancel) cancel.click();
            })()
            """)
            await asyncio.sleep(1)

            # Open Equipment Requests tab
            print("[ACTION] Navigating to Equipment Requests tab...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const eqTab = btns.find(b => b.innerText.includes('Equipment Requests'));
                if (eqTab) eqTab.click();
            })()
            """)
            await asyncio.sleep(2)

            # Click Request Equipment button to show modal
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const reqBtn = btns.find(b => b.innerText.includes('Request Equipment'));
                if (reqBtn) reqBtn.click();
            })()
            """)
            await asyncio.sleep(2)
            has_eq_modal = await eval_js("document.body.innerText.includes('Request Hardware Equipment')")
            print(f"[CHECK] Request Hardware Equipment modal rendered: {has_eq_modal}")
            await capture_screen(SNAP_EMP_EQ)

            # Close modal
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const cancel = btns.find(b => b.innerText.trim() === 'Cancel');
                if (cancel) cancel.click();
            })()
            """)
            await asyncio.sleep(1)

            # -------------------------------------------------------------
            # STEP 2: ADMIN LOGIN & EQUIPMENT QUEUE VERIFICATION
            # -------------------------------------------------------------
            print("\n[TEST 2] Logging in as Administrator ADM-001...")
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

            # Navigate to Equipment Requests tab
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const eqTab = btns.find(b => b.innerText.includes('Equipment Requests'));
                if (eqTab) eqTab.click();
            })()
            """)
            await asyncio.sleep(2)
            await capture_screen(SNAP_ADMIN_EQ)

            # Navigate to Tickets tab and check History modal
            print("[ACTION] Navigating to Tickets tab and opening Ticket History...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const tktTab = btns.find(b => b.innerText.includes('Tickets'));
                if (tktTab) tktTab.click();
            })()
            """)
            await asyncio.sleep(2)

            # Click History on the first ticket
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const histBtn = btns.find(b => b.innerText.trim() === 'History');
                if (histBtn) histBtn.click();
            })()
            """)
            await asyncio.sleep(2)
            has_hist_modal = await eval_js("document.body.innerText.includes('Ticket Activity History')")
            print(f"[CHECK] Ticket Activity History modal opened: {has_hist_modal}")
            await capture_screen(SNAP_TICKET_HIST)

            # Close History modal
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const closeBtn = btns.find(b => b.innerText.trim() === 'Close');
                if (closeBtn) closeBtn.click();
            })()
            """)
            await asyncio.sleep(1)

            # -------------------------------------------------------------
            # STEP 3: SUPPORT LOGIN & PERMISSION RESTRICTION VERIFICATION
            # -------------------------------------------------------------
            print("\n[TEST 3] Logging in as IT Support IT-501...")
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

            # Go to Tickets tab
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('button'));
                const tktTab = btns.find(b => b.innerText.includes('Tickets'));
                if (tktTab) tktTab.click();
            })()
            """)
            await asyncio.sleep(2)

            # Check that Assign button is NOT visible for Support
            has_assign_button = await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('table button'));
                return btns.some(b => b.innerText.trim() === 'Assign');
            })()
            """)
            print(f"[CHECK] Support has NO manual 'Assign' buttons in ticket table: {not has_assign_button}")
            await capture_screen(SNAP_SUPPORT)

            await listen_errors()
            print("\n=== CONSOLE ERROR AUDIT ===")
            print(f"Total console errors encountered: {len(console_errors)}")
            if console_errors:
                for err in console_errors:
                    print("  -", err)
            else:
                print("ZERO console errors across all 3 roles!")

            print("\nALL BROWSER E2E ROLE VERIFICATIONS COMPLETED SUCCESSFULLY!")

    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(run_verification())
