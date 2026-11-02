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

async def capture_all():
    print("=== STARTING COMPLETE DEEP TEAL WEBSITE-WIDE SCREENSHOT CAPTURE ===")
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
        for _ in range(40):
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

        async with websockets.connect(ws_url, max_size=30_000_000) as ws:
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
                    msg = await asyncio.wait_for(ws.recv(), timeout=15.0)
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        result = data.get("result", {})
                        if "exceptionDetails" in result:
                            raise RuntimeError(result["exceptionDetails"])
                        return result.get("result", {}).get("value")

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

            # 1. Clear session and open Login Page
            print("\n1. Capturing Login Page...")
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:8000/"})
            await asyncio.sleep(4)
            await eval_js("localStorage.clear(); location.reload();")
            await asyncio.sleep(4)
            await snap("teal_login_page.png")

            # 2. Switch to Registration Page
            print("\n2. Capturing Registration Page...")
            await eval_js("document.querySelector('.onboarding-box .link')?.click()")
            await asyncio.sleep(2)
            await snap("teal_register_page.png")

            # 3. Log in as ADMIN (Rajesh Sharma)
            print("\n3. Logging in as Admin (ADM-001)...")
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
            await snap("teal_admin_dashboard.png")

            # 4. Tickets Page
            print("\n4. Capturing Tickets Page...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const ticketBtn = btns.find(b => b.innerText.includes('Tickets'));
                if (ticketBtn) ticketBtn.click();
            })();
            """)
            await asyncio.sleep(2)
            await snap("teal_tickets_page.png")

            # 5. Assets Page
            print("\n5. Capturing Assets Page...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const assetBtn = btns.find(b => b.innerText.includes('Assets'));
                if (assetBtn) assetBtn.click();
            })();
            """)
            await asyncio.sleep(2)
            await snap("teal_assets_page.png")

            # 6. Employees Page
            print("\n6. Capturing Employees Page...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const empBtn = btns.find(b => b.innerText.includes('Employees'));
                if (empBtn) empBtn.click();
            })();
            """)
            await asyncio.sleep(2)
            await snap("teal_employees_page.png")

            # 7. SLA Page
            print("\n7. Capturing SLA Performance Page...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const slaBtn = btns.find(b => b.innerText.includes('SLA'));
                if (slaBtn) slaBtn.click();
            })();
            """)
            await asyncio.sleep(2)
            await snap("teal_sla_page.png")

            # 8. Audit Ledger Page
            print("\n8. Capturing Audit Ledger Page...")
            await eval_js("""
            (() => {
                const btns = Array.from(document.querySelectorAll('aside nav button'));
                const auditBtn = btns.find(b => b.innerText.includes('Audit'));
                if (auditBtn) auditBtn.click();
            })();
            """)
            await asyncio.sleep(2)
            await snap("teal_audit_page.png")

            # 9. Support Dashboard (Priya Patel, IT-501)
            print("\n9. Logging in as IT Support (IT-501)...")
            support_login = """
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
            await eval_js(support_login, await_promise=True)
            await asyncio.sleep(5)
            await snap("teal_support_dashboard.png")

            # 10. Employee Dashboard (Aarav Verma, EMP-101)
            print("\n10. Logging in as Employee (EMP-101)...")
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
            await snap("teal_employee_dashboard.png")

            # 11. Dark Mode Verification (Switch theme to dark)
            print("\n11. Capturing Dark Mode with Deep Teal...")
            await eval_js("""
            (() => {
                const themeBtn = Array.from(document.querySelectorAll('header button')).find(b => b.innerText.includes('Dark') || b.innerText.includes('Light'));
                if (themeBtn) themeBtn.click();
            })();
            """)
            await asyncio.sleep(2)
            await snap("teal_dark_mode.png")

            # 12. Mobile Responsive Verification (390x844)
            print("\n12. Capturing Mobile Responsive Viewport...")
            await send_cmd("Emulation.setDeviceMetricsOverride", {
                "width": 390,
                "height": 844,
                "deviceScaleFactor": 2,
                "mobile": True
            })
            await asyncio.sleep(2)
            await snap("teal_responsive_mobile.png")

            print("\n=== ALL 12 WEBSITE-WIDE SCREENSHOTS CAPTURED SUCCESSFULLY! ===")
            return True

    finally:
        try:
            proc.terminate()
            proc.wait(timeout=2)
        except Exception:
            proc.kill()

if __name__ == "__main__":
    success = asyncio.run(capture_all())
    sys.exit(0 if success else 1)

