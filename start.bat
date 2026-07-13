@echo off
echo Starting FreeTime Jira...
echo.
echo Starting backend (port 8000)...
start "FreeTime Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --reload --port 8000"
echo Starting frontend (port 3001)...
start "FreeTime Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3001
echo.
pause
