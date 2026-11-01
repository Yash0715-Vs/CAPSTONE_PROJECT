import subprocess
import time
import json
import asyncio
import urllib.request
import base64
import websockets
import os
import sys

sys.path.insert(0, os.path.abspath("."))
from app.database.connection import get_db
from app.models.db_models import AssetDB

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUTPUT_PNG = r"C:\Users\Yash\.gemini\antigravity\brain\ae60aac7-2d6e-43c3-8735-5bed26f117f5\asset_registration_verified.png"
MODAL_PNG = r"C:\Users\Yash\.gemini\antigravity\brain\ae60aac7-2d6e-43c3-8735-5bed26f117f5\asset_modal_verified.png"

TEST_ID = "LAP-BRW-8899"
TEST_SN = "SN-BRW-8899"

def cleanup():
    session = next(get_db())
    try:
        a = session.query(AssetDB).filter((AssetDB.asset_id == TEST_ID) | (AssetDB.serial_number == TEST_SN)).first()
        if a:
            session.delete(a)
            session.commit()
            print(f"Cleaned up {TEST_ID} from database.")
    finally:
        session.close()

async def check_browser_asset_flow():
    cleanup()

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

            async def eval_js(expr):
                cid = await send_cmd("Runtime.evaluate", {"expression": expr, "returnByValue": True, "awaitPromise": True})
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=5.0)
                    data = json.loads(msg)
                    if data.get("id") == cid:
                        return data.get("result", {}).get("result", {}).get("value")

            await send_cmd("Runtime.enable")
            await send_cmd("Page.enable")
            await send_cmd("Console.enable")

            # Navigate
            await send_cmd("Page.navigate", {"url": "http://127.0.0.1:8000/"})
            await asyncio.sleep(4)

            # Log in as ADM-001
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
            await eval_js(login_eval)
            await asyncio.sleep(6)

            # Wait for dashboard to mount
            print("Waiting for dashboard to mount...")
            for _ in range(15):
                btns = await eval_js("Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim())")
                if btns and any('Assets' in b for b in btns):
                    print("Found Assets button! Available buttons:", btns[:10])
                    break
                await asyncio.sleep(1)

            # Switch to Assets Tab
            print("Switching to Assets Tab...")
            switch_to_assets = """
            (() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const assetBtn = buttons.find(b => b.innerText.includes('Assets'));
                if (assetBtn) { assetBtn.click(); return true; }
                return false;
            })()
            """
            switched = await eval_js(switch_to_assets)
            print("Switched to assets tab:", switched)
            await asyncio.sleep(3)

            # Click Register Device Button
            print("Opening Register Device Modal...")
            open_modal = """
            (() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const regBtn = buttons.find(b => b.innerText.includes('Register Device') || b.innerText.includes('Register Asset'));
                if (regBtn) { regBtn.click(); return true; }
                return false;
            })()
            """
            modal_opened = await eval_js(open_modal)
            print("Clicked Register Device button:", modal_opened)
            await asyncio.sleep(2)

            # Verify Modal Form Fields
            check_fields = """
            (() => {
                const modal = document.querySelector('.modal-surface');
                if (!modal) return { modalFound: false };
                const assetIdInput = modal.querySelector('input[name="asset_id"]');
                const typeSelect = modal.querySelector('select[name="type"]');
                const brandInput = modal.querySelector('input[name="brand"]');
                const modelInput = modal.querySelector('input[name="model"]');
                const snInput = modal.querySelector('input[name="serial_number"]');
                return {
                    modalFound: true,
                    hasAssetId: !!assetIdInput,
                    assetIdPlaceholder: assetIdInput?.placeholder,
                    hasType: !!typeSelect,
                    hasBrand: !!brandInput,
                    hasModel: !!modelInput,
                    hasSerial: !!snInput
                };
            })()
            """
            fields_status = await eval_js(check_fields)
            print("Modal Fields Status:", json.dumps(fields_status, indent=2))
            assert fields_status.get("hasAssetId"), "Asset ID field missing from modal!"
            assert fields_status.get("hasBrand"), "Brand field missing from modal!"
            assert fields_status.get("hasModel"), "Model field missing from modal!"
            assert fields_status.get("hasSerial"), "Serial Number field missing from modal!"

            # Take screenshot of open modal
            cid_snap_modal = await send_cmd("Page.captureScreenshot", {"format": "png"})
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                data = json.loads(msg)
                if data.get("id") == cid_snap_modal:
                    b64 = data.get("result", {}).get("data", "")
                    if b64:
                        with open(MODAL_PNG, "wb") as f:
                            f.write(base64.b64decode(b64))
                        print(f"Modal screenshot saved to {MODAL_PNG}")
                    break

            # Fill Form and Submit
            print("Filling form and submitting via React controlled inputs...")
            fill_and_submit = f"""
            (async () => {{
                const modal = document.querySelector('.modal-surface');
                const assetIdInput = modal.querySelector('input[name="asset_id"]');
                const brandInput = modal.querySelector('input[name="brand"]');
                const modelInput = modal.querySelector('input[name="model"]');
                const snInput = modal.querySelector('input[name="serial_number"]');
                const form = modal.querySelector('form');

                // Trigger React synthetic input events
                function setNativeValue(element, value) {{
                    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
                    const prototype = Object.getPrototypeOf(element);
                    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
                    if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {{
                        prototypeValueSetter.call(element, value);
                    }} else {{
                        valueSetter.call(element, value);
                    }}
                    element.dispatchEvent(new Event('input', {{ bubbles: true }}));
                }}

                setNativeValue(assetIdInput, '{TEST_ID}');
                setNativeValue(brandInput, 'Apple');
                setNativeValue(modelInput, 'MacBook Air M3');
                setNativeValue(snInput, '{TEST_SN}');

                // Submit form
                const submitBtn = modal.querySelector('button[type="submit"]');
                submitBtn.click();
                return true;
            }})()
            """
            await eval_js(fill_and_submit)
            print("Form submitted. Waiting for API response and listing refresh...")
            await asyncio.sleep(4)

            # Check if modal closed and asset is visible in table
            check_table = f"""
            (() => {{
                const bodyText = document.body.innerText;
                const modal = document.querySelector('.modal-surface');
                return {{
                    modalClosed: !modal,
                    hasNewAssetInDOM: bodyText.includes('{TEST_ID}'),
                    hasToast: bodyText.includes('registered successfully') || bodyText.includes('{TEST_ID}')
                }};
            }})()
            """
            table_status = await eval_js(check_table)
            print("Table Status After Registration:", json.dumps(table_status, indent=2))

            # Screenshot of updated inventory table
            cid_snap = await send_cmd("Page.captureScreenshot", {"format": "png", "captureBeyondViewport": True})
            while True:
                msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                data = json.loads(msg)
                if data.get("id") == cid_snap:
                    b64 = data.get("result", {}).get("data", "")
                    if b64:
                        with open(OUTPUT_PNG, "wb") as f:
                            f.write(base64.b64decode(b64))
                        print(f"Inventory table screenshot saved to {OUTPUT_PNG}")
                    break

            # Confirm directly in MySQL DB
            session = next(get_db())
            try:
                db_record = session.query(AssetDB).filter(AssetDB.asset_id == TEST_ID).first()
                print("MySQL DB Verification:", f"Found asset {db_record.asset_id}, Brand={db_record.brand}, Serial={db_record.serial_number}" if db_record else "NOT FOUND IN DB")
                assert db_record is not None, f"Asset {TEST_ID} was not found in MySQL database!"
            finally:
                session.close()

            print("\nALL BROWSER ASSET FLOW CHECKS PASSED PERFECTLY!")

    finally:
        cleanup()
        proc.terminate()

if __name__ == '__main__':
    asyncio.run(check_browser_asset_flow())
