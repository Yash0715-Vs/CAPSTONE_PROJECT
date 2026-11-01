import subprocess
import time
import sys
import urllib.request
import json

def run():
    print("--- 1. Starting FastAPI Backend ---")
    server = subprocess.Popen(
        [r".\.venv\Scripts\python.exe", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True
    )

    try:
        started = False
        for _ in range(25):
            try:
                with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=1) as resp:
                    if resp.status == 200:
                        print("Server is UP and HEALTHY!")
                        started = True
                        break
            except Exception:
                time.sleep(0.5)

        if not started:
            print("Server failed to start!")
            sys.exit(1)

        print("\n--- 2. Running End-to-End Asset Modal & Browser Test ---")
        res = subprocess.run(
            [r".\.venv\Scripts\python.exe", "tests/check_asset_modal_browser.py"],
            capture_output=True,
            text=True
        )
        print("STDOUT:\n", res.stdout)
        if res.stderr:
            print("STDERR:\n", res.stderr)

        if res.returncode != 0:
            print(f"FAILED with returncode {res.returncode}")
            sys.exit(res.returncode)

    finally:
        print("Stopping server...")
        server.terminate()
        try:
            server.wait(timeout=5)
        except Exception:
            server.kill()

if __name__ == '__main__':
    run()

