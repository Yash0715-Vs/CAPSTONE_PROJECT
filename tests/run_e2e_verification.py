import subprocess
import time
import sys
import urllib.request
import json
import os

def run_verification():
    print("--- 1. Starting FastAPI Backend on http://127.0.0.1:8000 ---")
    server = subprocess.Popen(
        [r".\.venv\Scripts\python.exe", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    try:
        # Wait for server to become responsive
        started = False
        for _ in range(25):
            try:
                with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=1) as resp:
                    if resp.status == 200:
                        data = json.loads(resp.read().decode())
                        print("Health check passed:", data)
                        started = True
                        break
            except Exception:
                time.sleep(0.5)

        if not started:
            print("Failed to start server. Logs:")
            server.terminate()
            out, _ = server.communicate(timeout=5)
            print(out)
            sys.exit(1)

        print("\n--- 2. Verifying OpenAPI & Root HTML endpoints ---")
        with urllib.request.urlopen("http://127.0.0.1:8000/docs") as resp:
            print(f"/docs status: {resp.status}")

        with urllib.request.urlopen("http://127.0.0.1:8000/") as resp:
            content = resp.read().decode()
            print(f"/ status: {resp.status}, HTML length: {len(content)}, Title present: {'AssetDesk' in content}")

        print("\n--- 3. Running Browser CDP Verification (Headless Chrome) ---")
        chrome_result = subprocess.run(
            [r".\.venv\Scripts\python.exe", "tests/check_browser_console.py"],
            capture_output=True,
            text=True
        )
        print("STDOUT:\n", chrome_result.stdout)
        if chrome_result.stderr:
            print("STDERR:\n", chrome_result.stderr)

        print("\n--- E2E Verification Finished Successfully ---")

    finally:
        print("Stopping FastAPI server...")
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()

if __name__ == '__main__':
    run_verification()

