import subprocess
import time
import json
import asyncio
import urllib.request
import websockets
import os

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
APP_URL = "http://localhost:8000"

class BrowserTab:
    def __init__(self, name, tab_id, ws_url):
        self.name = name
        self.tab_id = tab_id
        self.ws_url = ws_url
        self.ws = None
        self.msg_id = 1

    async def connect(self, target_url=None):
        self.ws = await websockets.connect(self.ws_url, max_size=25_000_000)
        await self.send_cmd("Page.enable")
        await self.send_cmd("Runtime.enable")
        if target_url:
            await self.send_cmd("Page.navigate", {"url": target_url})
            await asyncio.sleep(2.0)

    async def send_cmd(self, method, params=None):
        cid = self.msg_id
        self.msg_id += 1
        payload = {"id": cid, "method": method}
        if params:
            payload["params"] = params
        await self.ws.send(json.dumps(payload))
        while True:
            raw = await self.ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == cid:
                return msg.get("result", {})

    async def evaluate(self, expr):
        res = await self.send_cmd("Runtime.evaluate", {
            "expression": expr,
            "returnByValue": True,
            "awaitPromise": True
        })
        if "exceptionDetails" in res:
            return {"error": res["exceptionDetails"]}
        return res.get("result", {}).get("value")

    async def wait_for_login_page(self, timeout=12):
        start = time.time()
        while time.time() - start < timeout:
            has_login = await self.evaluate("!!document.getElementById('work-email')")
            if has_login is True:
                return True
            await asyncio.sleep(0.3)
        return False

    async def wait_for_authenticated(self, timeout=12):
        start = time.time()
        while time.time() - start < timeout:
            is_auth = await self.evaluate("!document.getElementById('work-email') && document.body.innerText.includes('Workspace')")
            if is_auth is True:
                return True
            # Also check for presence of user badge or logout
            is_auth2 = await self.evaluate("!document.getElementById('work-email') && document.querySelectorAll('.workspace-sidebar, .sidebar, button').length > 5")
            if is_auth2 is True:
                return True
            await asyncio.sleep(0.3)
        return False

    async def close(self):
        if self.ws:
            await self.ws.close()

async def run_three_tabs_test():
    print("=" * 70)
    print("🚀 STARTING THREE INDEPENDENT SESSIONS BROWSER TEST")
    print("=" * 70)

    # 1. Launch Chrome with remote debugging on port 9222
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1440,960",
        "about:blank"
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    test_results = {}

    try:
        await asyncio.sleep(2.0)

        # Open Tab 1 (IT Support) in the Chrome window
        req1 = urllib.request.Request(f"http://127.0.0.1:9222/json/new", method="PUT")
        with urllib.request.urlopen(req1) as r:
            tab1_info = json.loads(r.read().decode())
        tab1 = BrowserTab("Tab 1 (IT Support)", tab1_info["id"], tab1_info["webSocketDebuggerUrl"])
        await tab1.connect(target_url=f"{APP_URL}/")
        print(f"[OK] Created & navigated Tab 1 ({tab1.tab_id[:8]}...) to {APP_URL}")

        # Open Tab 2 (Admin) in the SAME Chrome window
        req2 = urllib.request.Request(f"http://127.0.0.1:9222/json/new", method="PUT")
        with urllib.request.urlopen(req2) as r:
            tab2_info = json.loads(r.read().decode())
        tab2 = BrowserTab("Tab 2 (Admin)", tab2_info["id"], tab2_info["webSocketDebuggerUrl"])
        await tab2.connect(target_url=f"{APP_URL}/")
        print(f"[OK] Created & navigated Tab 2 ({tab2.tab_id[:8]}...) to {APP_URL}")

        # Open Tab 3 (Employee) in the SAME Chrome window
        req3 = urllib.request.Request(f"http://127.0.0.1:9222/json/new", method="PUT")
        with urllib.request.urlopen(req3) as r:
            tab3_info = json.loads(r.read().decode())
        tab3 = BrowserTab("Tab 3 (Employee)", tab3_info["id"], tab3_info["webSocketDebuggerUrl"])
        await tab3.connect(target_url=f"{APP_URL}/")
        print(f"[OK] Created & navigated Tab 3 ({tab3.tab_id[:8]}...) to {APP_URL}")

        # Wait for React LoginPage to mount in all 3 tabs
        for tab in [tab1, tab2, tab3]:
            ready = await tab.wait_for_login_page(timeout=12)
            assert ready, f"Tab {tab.name} failed to mount LoginPage"

        # Verify all 3 tabs initially show the login page
        t1_login = await tab1.evaluate("!!document.getElementById('work-email')")
        t2_login = await tab2.evaluate("!!document.getElementById('work-email')")
        t3_login = await tab3.evaluate("!!document.getElementById('work-email')")
        print(f"\n[TEST 1] All 3 newly opened tabs display login screen independently:")
        print(f"  - Tab 1 displays login: {t1_login}")
        print(f"  - Tab 2 displays login: {t2_login}")
        print(f"  - Tab 3 displays login: {t3_login}")
        test_results["independent_initial_login_screens"] = bool(t1_login and t2_login and t3_login)

        # Helper to perform login inside a tab
        async def login(tab, user_id, password="password"):
            script = f"""
            (() => {{
                const emailInput = document.getElementById("work-email");
                const pwdInput = document.getElementById("password");
                if (!emailInput || !pwdInput) return false;
                const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                setter.call(emailInput, "{user_id}");
                emailInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
                setter.call(pwdInput, "{password}");
                pwdInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
                const btn = document.querySelector(".btn-submit-workspace");
                if (btn) btn.click();
                return true;
            }})()
            """
            await tab.evaluate(script)

        # Step 1: Log in Tab 1 as IT Support (IT-503)
        print("\n--> Logging in Tab 1 as IT Support (IT-503)...")
        t1_pre = await tab1.evaluate("document.body.innerText.slice(0, 150)")
        print(f"DEBUG Tab 1 pre-login text: {t1_pre.replace(chr(10), ' ')}")
        login_res = await login(tab1, "IT-503", "password")
        print(f"DEBUG Tab 1 login click res: {login_res}")
        t1_ready = await tab1.wait_for_authenticated(timeout=10)
        print(f"DEBUG Tab 1 wait_for_authenticated: {t1_ready}")
        await asyncio.sleep(2.0)
        t1_post = await tab1.evaluate("document.body.innerText.slice(0, 200)")
        print(f"DEBUG Tab 1 post-login text: {t1_post.replace(chr(10), ' ')}")

        # Check Tab 1 state
        t1_auth = await tab1.evaluate("""
            (() => {
                const bodyText = document.body.innerText;
                return (bodyText.includes("IT-503") || bodyText.includes("Karthik Raman") || bodyText.includes("IT Support") || bodyText.includes("SUPPORT")) && !document.getElementById('work-email');
            })()
        """)
        print(f"[OK] Tab 1 logged in as IT Support: {t1_auth}")

        # VERIFY Tab 2 and Tab 3 are STILL on the login screen!
        t2_still_login = await tab2.evaluate("!!document.getElementById('work-email')")
        t3_still_login = await tab3.evaluate("!!document.getElementById('work-email')")
        print(f"[TEST 2] Tab 2 and Tab 3 remained at Login Screen after Tab 1 login:")
        print(f"  - Tab 2 still login: {t2_still_login}")
        print(f"  - Tab 3 still login: {t3_still_login}")
        test_results["tab1_login_isolation"] = bool(t1_auth and t2_still_login and t3_still_login)

        # Step 2: Log in Tab 2 as Admin (ADM-001)
        print("\n--> Logging in Tab 2 as Admin (ADM-001)...")
        await login(tab2, "ADM-001", "password")
        await tab2.wait_for_authenticated(timeout=10)
        await asyncio.sleep(1.5)

        t2_auth = await tab2.evaluate("""
            (() => {
                const bodyText = document.body.innerText;
                return (bodyText.includes("ADM-001") || bodyText.includes("Rajesh Sharma") || bodyText.includes("ADMIN")) && !document.getElementById('work-email');
            })()
        """)
        print(f"[OK] Tab 2 logged in as Admin: {t2_auth}")

        # Check Tab 3 is STILL on login screen
        t3_still_login2 = await tab3.evaluate("!!document.getElementById('work-email')")
        print(f"[TEST 3] Tab 3 remained at Login Screen after Tab 2 login: {t3_still_login2}")
        test_results["tab2_login_isolation"] = bool(t2_auth and t3_still_login2)

        # Step 3: Log in Tab 3 as Employee (EMP-101)
        print("\n--> Logging in Tab 3 as Employee (EMP-101)...")
        await login(tab3, "EMP-101", "password")
        await tab3.wait_for_authenticated(timeout=10)
        await asyncio.sleep(1.5)

        t3_auth = await tab3.evaluate("""
            (() => {
                const bodyText = document.body.innerText;
                return (bodyText.includes("EMP-101") || bodyText.includes("Aarav Verma") || bodyText.includes("EMPLOYEE")) && !document.getElementById('work-email');
            })()
        """)
        print(f"[OK] Tab 3 logged in as Employee: {t3_auth}")

        # Confirm all 3 tabs maintain their 3 distinct authenticated roles simultaneously!
        t1_role = await tab1.evaluate("document.body.innerText.includes('IT-503') || document.body.innerText.includes('Karthik Raman') || document.body.innerText.includes('IT Support')")
        t2_role = await tab2.evaluate("document.body.innerText.includes('ADM-001') || document.body.innerText.includes('Rajesh Sharma')")
        t3_role = await tab3.evaluate("document.body.innerText.includes('EMP-101') || document.body.innerText.includes('Aarav Verma')")
        print(f"\n[TEST 4] Three independent sessions active simultaneously:")
        print(f"  - Tab 1 IT Support (IT-501): {t1_role}")
        print(f"  - Tab 2 Admin (ADM-001): {t2_role}")
        print(f"  - Tab 3 Employee (EMP-101): {t3_role}")
        test_results["three_simultaneous_sessions"] = bool(t1_role and t2_role and t3_role)

        # Step 4: Create a ticket from Employee tab (Tab 3)
        print("\n--> Creating a ticket from Tab 3 (Employee Aarav Verma)...")
        ticket_title = f"Network Latency Incident {int(time.time())}"
        create_res = await tab3.evaluate(f"""
            (async () => {{
                const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("New Ticket"));
                if (btn) btn.click();
                await new Promise(r => setTimeout(r, 600));

                const titleInput = document.querySelector("input[placeholder*='intermittently' i]") || document.querySelector(".modal-surface input");
                const descInput = document.querySelector("textarea[placeholder*='symptoms' i]") || document.querySelector(".modal-surface textarea");
                if (!titleInput || !descInput) return {{ success: false, reason: "Modal inputs not found" }};

                const setVal = (el, val) => {{
                    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
                    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                    if (setter) setter.call(el, val);
                    el.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }};
                setVal(titleInput, "{ticket_title}");
                setVal(descInput, "High packet loss during client presentation on floor 3.");

                const submitBtn = Array.from(document.querySelectorAll(".modal-surface button")).find(b => b.textContent.includes("Submit to Queue") || b.textContent.includes("Submit Ticket"));
                if (submitBtn) submitBtn.click();
                return {{ success: true, title: "{ticket_title}" }};
            }})()
        """)
        print(f"[OK] Employee ticket submitted: {create_res}")
        await asyncio.sleep(2.5)

        # Check real-time update in Tab 2 (Admin) and Tab 1 (IT Support)
        t2_has_ticket = await tab2.evaluate(f"document.body.innerText.includes('{ticket_title}')")
        t1_has_ticket = await tab1.evaluate(f"document.body.innerText.includes('{ticket_title}')")
        t3_has_ticket = await tab3.evaluate(f"document.body.innerText.includes('{ticket_title}')")
        print(f"\n[TEST 5] Real-Time WebSocket broadcast of new ticket to all 3 tabs:")
        print(f"  - Tab 2 (Admin) received real-time ticket: {t2_has_ticket}")
        print(f"  - Tab 1 (IT Support) received real-time ticket: {t1_has_ticket}")
        print(f"  - Tab 3 (Employee) shows created ticket: {t3_has_ticket}")
        test_results["websocket_ticket_creation_broadcast"] = bool(t2_has_ticket and t1_has_ticket and t3_has_ticket)

        # Step 5: Update and Resolve ticket from Tab 1 (IT Support)
        print("\n--> Resolving ticket from Tab 1 (IT Support)...")
        resolve_res = await tab1.evaluate(f"""
            (async () => {{
                const rows = Array.from(document.querySelectorAll("tr"));
                const targetRow = rows.find(r => r.innerText.includes("{ticket_title}"));
                if (!targetRow) return {{ success: false, reason: "Ticket row not found in Tab 1" }};

                const resolveBtn = Array.from(targetRow.querySelectorAll("button")).find(b => b.textContent.includes("Resolve"));
                if (!resolveBtn) return {{ success: false, reason: "Resolve button not found" }};
                resolveBtn.click();
                await new Promise(r => setTimeout(r, 600));

                const noteArea = document.querySelector("textarea[name='notes']") || document.querySelector(".modal-surface textarea");
                if (noteArea) {{
                    const proto = window.HTMLTextAreaElement.prototype;
                    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                    if (setter) setter.call(noteArea, "Replaced damaged Cat6 cable on patch panel 3 and verified throughput.");
                    noteArea.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }}

                await new Promise(r => setTimeout(r, 400));
                const form = document.querySelector(".modal-surface form");
                if (form) {{
                    const submitBtn = form.querySelector("button[type='submit']");
                    if (submitBtn) submitBtn.click();
                }}
                return {{ success: true }};
            }})()
        """)
        print(f"[OK] IT Support resolve action triggered: {resolve_res}")
        await asyncio.sleep(2.5)

        # Verify resolution in Tab 2 (Admin) and Tab 3 (Employee)
        t2_resolved = await tab2.evaluate(f"""
            (() => {{
                return document.body.innerText.includes("RESOLVED") || document.body.innerText.includes("Resolved");
            }})()
        """)
        t3_resolved = await tab3.evaluate(f"""
            (() => {{
                return document.body.innerText.includes("RESOLVED") || document.body.innerText.includes("Resolved");
            }})()
        """)
        print(f"\n[TEST 6] Real-Time WebSocket broadcast of ticket resolution:")
        print(f"  - Tab 2 (Admin) reflects resolution: {t2_resolved}")
        print(f"  - Tab 3 (Employee) reflects resolution: {t3_resolved}")
        test_results["websocket_ticket_resolution_broadcast"] = bool(t2_resolved and t3_resolved)

        # Step 6: Log out from Tab 2 (Admin)
        print("\n--> Logging out from Tab 2 (Admin)...")
        await tab2.evaluate("""
            (() => {
                const btn = Array.from(document.querySelectorAll("button")).find(b => b.title === 'Sign Out' || b.innerText.includes('Sign Out') || b.querySelector(".material-symbols-outlined")?.innerText === 'logout');
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(2.0)

        # Confirm Tab 2 logged out
        t2_is_logout = await tab2.evaluate("!!document.getElementById('work-email')")
        print(f"[OK] Tab 2 returned to Login Screen: {t2_is_logout}")

        # CRITICAL VERIFICATION: Confirm Tab 1 (IT Support) and Tab 3 (Employee) REMAIN AUTHENTICATED!
        t1_still_authenticated = await tab1.evaluate("""
            (() => {
                const bodyText = document.body.innerText;
                return (bodyText.includes("IT-503") || bodyText.includes("Karthik Raman") || bodyText.includes("IT Support")) && !document.getElementById('work-email');
            })()
        """)
        t3_still_authenticated = await tab3.evaluate("""
            (() => {
                const bodyText = document.body.innerText;
                return (bodyText.includes("EMP-101") || bodyText.includes("Aarav Verma") || bodyText.includes("Employee")) && !document.getElementById('work-email');
            })()
        """)
        print(f"\n[TEST 7] Tabs 1 and 3 remain independently authenticated after Tab 2 logs out:")
        print(f"  - Tab 1 (IT Support) still logged in: {t1_still_authenticated}")
        print(f"  - Tab 3 (Employee) still logged in: {t3_still_authenticated}")
        test_results["tab2_logout_preserves_other_tabs"] = bool(t1_still_authenticated and t3_still_authenticated)

        # Step 7: Open a newly duplicated/created tab (Tab 4) and verify it requires its own login
        req4 = urllib.request.Request(f"http://127.0.0.1:9222/json/new", method="PUT")
        with urllib.request.urlopen(req4) as r:
            tab4_info = json.loads(r.read().decode())
        tab4 = BrowserTab("Tab 4 (Duplicated/New Tab)", tab4_info["id"], tab4_info["webSocketDebuggerUrl"])
        await tab4.connect(target_url=f"{APP_URL}/")
        await tab4.wait_for_login_page(timeout=10)
        t4_login = await tab4.evaluate("!!document.getElementById('work-email')")
        print(f"\n[TEST 8] Newly duplicated/opened Tab 4 displays Login Screen: {t4_login}")
        test_results["new_tab_requires_own_login"] = bool(t4_login)

        print("\n" + "=" * 70)
        print("SUMMARY OF TEST RESULTS:")
        all_passed = True
        for name, passed in test_results.items():
            status_str = "PASS ✅" if passed else "FAIL ❌"
            print(f"  - {name}: {status_str}")
            if not passed:
                all_passed = False
        print("=" * 70)

        return all_passed

    finally:
        proc.terminate()

if __name__ == "__main__":
    success = asyncio.run(run_three_tabs_test())
    exit(0 if success else 1)
