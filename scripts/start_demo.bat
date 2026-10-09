@echo off
echo ==================================================
echo  Starting AI Banquet Food Waste Platform (Windows)
echo ==================================================
set ROOT_DIR=%~dp0..
cd /d "%ROOT_DIR%"

echo Starting Backend on http://127.0.0.1:8000 ...
start "Backend (FastAPI)" /b ".\backend\venv\Scripts\uvicorn.exe" app.main:app --app-dir backend --host 127.0.0.1 --port 8000

echo Starting Frontend on http://127.0.0.1:3000 ...
cd /d "%ROOT_DIR%\frontend"
start "Frontend (Next.js)" /b cmd.exe /c "npx.cmd next start -p 3000 -H 127.0.0.1"

cd /d "%ROOT_DIR%"
echo ==================================================
echo Services started:
echo   Frontend : http://localhost:3000
echo   Backend  : http://localhost:8000
echo   API Docs : http://localhost:8000/docs
echo ==================================================
