@echo off
echo ========================================
echo ADMIPAEDIA Full Stack Debug Startup
echo ========================================

REM Start backend in a new window
echo Starting backend server...
start "ADMIPAEDIA Backend Debug" cmd /k "start_debug.bat"

REM Wait a moment for backend to start
timeout /t 5 /nobreak >nul

REM Start frontend in a new window
echo Starting frontend server...
start "ADMIPAEDIA Frontend Debug" cmd /k "start_frontend_debug.bat"

echo.
echo ========================================
echo Both servers are starting...
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Check the individual windows for logs
echo Press any key to close this window
echo ========================================

pause