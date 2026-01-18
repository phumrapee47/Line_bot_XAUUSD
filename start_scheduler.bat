@echo off
REM XAUUSD Trading Bot Scheduler Launcher
REM This script starts the daily trading analysis scheduler

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo.
echo ================================================================================
echo   XAUUSD Trading Bot - Daily Scheduler Launcher
echo ================================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo Python found: 
python --version
echo.

REM Check if ml-models directory exists
if not exist "ml-models" (
    echo ERROR: ml-models directory not found
    echo Please run this from the project root directory
    pause
    exit /b 1
)

REM Check if scheduler.py exists
if not exist "ml-models\scheduler.py" (
    echo ERROR: scheduler.py not found in ml-models directory
    pause
    exit /b 1
)

echo.
echo Starting scheduler...
echo The trading analysis will run every day at 08:00 AM
echo Press Ctrl+C to stop the scheduler
echo.

REM Run the scheduler
cd ml-models
python scheduler.py

if errorlevel 1 (
    echo.
    echo ERROR: Scheduler failed to start
    echo Check your Python installation and configuration
    pause
    exit /b 1
)

pause
