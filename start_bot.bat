@echo off
echo Starting XAUUSD Trading Bot...

:: Start Daily Analysis Scheduler
echo Starting Python Scheduler...
start "XAUUSD Daily Scheduler" cmd /k "cd ml-models && python scheduler.py"

:: Start Real-time Signal Server
echo Starting Node.js Server...
start "XAUUSD Real-time Signal" cmd /k "cd backend && npm start"

echo Both systems started! You can minimize the windows.
timeout /t 5 >nul
