@echo off
echo ========================================
echo    ADMIPAEDIA Debug Mode Launcher
echo ========================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ and try again
    pause
    exit /b 1
)

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js 16+ and try again
    pause
    exit /b 1
)

echo ✅ Python and Node.js are available
echo.

REM Create logs directory
if not exist "logs" mkdir logs

echo 🔧 Debug Mode Options:
echo 1. Start Backend Only (Python/Flask)
echo 2. Start Frontend Only (React/Vite)
echo 3. Start Both (Recommended)
echo 4. View Recent Logs
echo 5. Exit
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto backend_only
if "%choice%"=="2" goto frontend_only
if "%choice%"=="3" goto start_both
if "%choice%"=="4" goto view_logs
if "%choice%"=="5" goto exit
goto invalid_choice

:backend_only
echo.
echo 🚀 Starting Backend in Debug Mode...
echo ========================================
python debug_backend.py
goto end

:frontend_only
echo.
echo 🚀 Starting Frontend in Debug Mode...
echo ========================================
cd frontend
npm run dev
goto end

:start_both
echo.
echo 🚀 Starting Both Backend and Frontend in Debug Mode...
echo ========================================
echo.
echo Starting Backend...
start "ADMIPAEDIA Backend Debug" cmd /k "python debug_backend.py"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend...
start "ADMIPAEDIA Frontend Debug" cmd /k "cd frontend && npm run dev"
echo.
echo ✅ Both servers are starting in separate windows
echo 🌐 Backend: http://localhost:5000
echo 🌐 Frontend: http://localhost:3000
echo.
echo Press any key to return to menu...
pause >nul
goto start

:view_logs
echo.
echo 📋 Recent Debug Logs:
echo ========================================
if exist "logs\*.log" (
    for /f %%i in ('dir /b /o-d logs\*.log 2^>nul') do (
        echo 📄 %%i
        echo ----------------------------------------
        type "logs\%%i" | more
        goto log_shown
    )
    :log_shown
) else (
    echo No log files found. Start the application first.
)
echo.
echo Press any key to return to menu...
pause >nul
goto start

:invalid_choice
echo.
echo ❌ Invalid choice. Please enter 1-5.
echo.
goto start

:exit
echo.
echo 👋 Goodbye!
goto end

:start
cls
goto :eof

:end
echo.
echo Press any key to exit...
pause >nul