import subprocess
import time
import json
import asyncio
import urllib.request
import base64
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_PNG = r"C:\Users\Yash\.gemini\antigravity\brain\ae60aac7-2d6e-43c3-8735-5bed26f117f5\live_dashboard_verified.png"

async def check():
    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--remote-debugging-port=9222",
        "--disable-gpu",
        "--no-sandbox",
        "--window-size=1440,900",
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
            print("Could not connect to Chrome debugging port")
            return

        async with websockets.connect(ws_url) as ws:
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

            await send_cmd("Runtime.enable")
            await send_cmd("Page.enable")
            await send_cmd("Console.enable")
            await send_cmd("Log.enable")

            # Navigate to local server
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:8000/"})
            await asyncio.sleep(3)

            # Wait for initial page to load and Babel to transpile
            print("Navigated to http://127.0.0.1:8000/, waiting for Babel compilation...")
            await asyncio.sleep(5)

            # Log in as ADM-001 (Admin)
            print("Logging in as ADM-001...")
            login_eval = """
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
            await send_cmd("Runtime.evaluate", {"expression": login_eval, "awaitPromise": True})

            # Wait for page reload and authenticated dashboard to mount
            print("Waiting for page reload and authenticated dashboard render...")
            await asyncio.sleep(7)

            # Check DOM contents and console errors
            check_eval = """
            ({
                url: window.location.href,
                readyState: document.readyState,
                rootLength: document.getElementById('root')?.innerHTML?.length || 0,
                headlineText: document.querySelector('h1')?.innerText || document.querySelector('.table-header-title')?.innerText || '',
                bodyTextSample: document.body?.innerText?.slice(0, 500) || '',
                hasFleet: document.body?.innerText?.includes('Hardware') || document.body?.innerText?.includes('AssetDesk'),
                hasLogout: document.body?.innerText?.includes('Sign Out') || document.body?.innerText?.includes('Logout')
            })
            """
            cid = await send_cmd("Runtime.evaluate", {"expression": check_eval, "returnByValue": True})

            # Process responses
            result_val = None
            errors = []
            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=1.5)
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        result_val = data.get("result", {}).get("result", {}).get("value")
                    elif data.get("method") == "Runtime.exceptionThrown":
                        details = data["params"]["exceptionDetails"]
                        errors.append(f"[EXCEPTION] {details.get('text')} - {details.get('exception', {}).get('description', '')}")
                    elif data.get("method") == "Runtime.consoleAPICalled":
                        args = [str(a.get("value", a.get("description", ""))) for a in data["params"]["args"]]
                        msg_str = ' '.join(args)
                        if data["params"]["type"] == "error":
                            errors.append(f"[CONSOLE ERROR] {msg_str}")
                        else:
                            print(f"[CONSOLE {data['params']['type'].upper()}] {msg_str}")
                except asyncio.TimeoutError:
                    break

            print("=== CDP VERIFICATION RESULT ===")
            print("Errors:", errors if errors else "ZERO ERRORS!")
            print("DOM Check:", json.dumps(result_val, indent=2))

            # Capture full page screenshot
            cid_snap = await send_cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
            while True:
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                    data = json.loads(msg)
                    if data.get("id") == cid_snap:
                        b64 = data.get("result", {}).get("data", "")
                        if b64:
                            with open(OUTPUT_PNG, "wb") as f:
                                f.write(base64.b64decode(b64))
                            print(f"Full page screenshot successfully saved to {OUTPUT_PNG}")
                        break
                except asyncio.TimeoutError:
                    break

    finally:
        proc.terminate()

if __name__ == "__main__":
    asyncio.run(check())
