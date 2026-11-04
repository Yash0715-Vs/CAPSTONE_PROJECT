@echo off
title AssetDesk IT Asset & Ticket Management System Backend
cd /d "%~dp0"
echo =====================================================================
echo  AssetDesk Backend Server (FastAPI + MySQL 8.0)
echo =====================================================================
echo.
echo Starting Uvicorn server on http://127.0.0.1:8000 ...
echo.
echo Dashboard URL: http://127.0.0.1:8000
echo API Docs URL:  http://127.0.0.1:8000/docs
echo.
echo Press CTRL+C to stop the server at any time.
echo =====================================================================
echo.

.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause

