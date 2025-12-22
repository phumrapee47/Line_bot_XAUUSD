@echo off
REM Gold Trading Bot Startup Script for Windows

echo.
echo 0x1F6AB Gold Trading Bot Startup
echo ================================
echo.

REM Check Python installation
echo Checking Python...
python3 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo. ❌ Python3 not found. Please install Python 3.8+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python3 --version') do echo ✅ %%i
echo.

REM Install Python dependencies
echo Installing Python dependencies...
cd ml-models
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ❌ Failed to install Python dependencies
    pause
    exit /b 1
)
echo ✅ Python dependencies installed
cd ..
echo.

REM Check Node.js installation
echo Checking Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found. Please install Node.js 14+
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo ✅ Node %%i
echo.

REM Install Node dependencies
echo Installing Node.js dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (
    echo ❌ Failed to install Node dependencies
    pause
    exit /b 1
)
echo ✅ Node dependencies installed
echo.

REM Create logs directory
if not exist logs (
    mkdir logs
)

REM Check .env file
if not exist "..\..\.env" (
    echo ⚠️  .env file not found in root directory
    echo Please configure .env file with your LINE_NOTIFY_TOKEN
)
echo.

echo ✅ Setup complete!
echo.
echo To start the bot, run:
echo   npm start          ^(Production mode^)
echo   npm run dev        ^(Development mode with auto-reload^)
echo.
echo Don't forget to set your LINE_NOTIFY_TOKEN in .env file!
echo.
pause
