@echo off
REM XAUUSD Trading Bot Pipeline Runner
REM This script runs the daily trading analysis pipeline once

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo.
echo ================================================================================
echo   XAUUSD Trading Bot - Manual Pipeline Run
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

REM Check if daily_trading_pipeline.py exists
if not exist "ml-models\daily_trading_pipeline.py" (
    echo ERROR: daily_trading_pipeline.py not found in ml-models directory
    pause
    exit /b 1
)

echo.
echo Running trading analysis pipeline...
echo This may take several minutes to complete
echo.

REM Run the pipeline
cd ml-models
python daily_trading_pipeline.py

if errorlevel 1 (
    echo.
    echo ERROR: Pipeline failed
    echo Check your configuration and try again
    pause
    exit /b 1
) else (
    echo.
    echo SUCCESS: Pipeline completed successfully!
    echo Check backend\data\ for generated images
    pause
)
