@echo off
REM XAUUSD Trading Bot - Installation Script
REM This script sets up the complete environment

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo.
echo ================================================================================
echo   XAUUSD Trading Bot - Installation & Setup
echo ================================================================================
echo.

REM Step 1: Check Python installation
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ ERROR: Python is not installed or not in PATH
    echo Please download and install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo ✓ Python found: 
python --version
echo.

REM Step 2: Upgrade pip
echo [2/5] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo ⚠ Warning: pip upgrade failed, continuing anyway...
)
echo.

REM Step 3: Install Python packages
echo [3/5] Installing Python packages...
echo Installing from ml-models\requirements.txt...
pip install -r ml-models\requirements.txt
if errorlevel 1 (
    echo ❌ ERROR: Failed to install Python packages
    pause
    exit /b 1
)
echo ✓ Python packages installed successfully
echo.

REM Step 4: Create required directories
echo [4/5] Creating required directories...
if not exist "backend\data\predictions" mkdir backend\data\predictions
if not exist "backend\data\graphs" mkdir backend\data\graphs
if not exist "backend\logs" mkdir backend\logs
if not exist "ml-models\__pycache__" mkdir ml-models\__pycache__
echo ✓ Directories created
echo.

REM Step 5: Run configuration check
echo [5/5] Running configuration check...
python check_config.py
if errorlevel 1 (
    echo ⚠ Warning: Some configuration checks failed
    echo Please review the errors above and fix them manually
)

echo.
echo ================================================================================
echo   INSTALLATION COMPLETE
echo ================================================================================
echo.
echo Next steps:
echo.
echo 1. Edit the .env file in the project root and add your API keys:
echo    - GEMINI_API_KEY
echo    - LINE_CHANNEL_ACCESS_TOKEN
echo    - LINE_USER_ID
echo.
echo 2. Test the system by running:
echo    run_pipeline.bat    (one-time run)
echo    OR
echo    start_scheduler.bat (daily automatic run at 8:00 AM)
echo.
echo 3. Read the documentation:
echo    SETUP_GUIDE.md - Detailed setup instructions
echo    ml-models\README_SYSTEM.md - System overview
echo.
echo Good luck! 🚀
echo.

pause
