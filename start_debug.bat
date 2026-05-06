@echo off
echo ========================================
echo ADMIPAEDIA Debug Mode Startup
echo ========================================

REM Check if virtual environment exists
if not exist "venv_py311_new\Scripts\activate.bat" (
    echo Error: Virtual environment not found!
    echo Please ensure venv_py311_new exists in the project root.
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv_py311_new\Scripts\activate.bat

REM Check if required services are running
echo Checking required services...

REM Check PostgreSQL
echo Checking PostgreSQL connection...
python -c "import psycopg2; psycopg2.connect('postgresql://postgres:Barbie198320132025@localhost:5432/admipaedia')" 2>nul
if errorlevel 1 (
    echo Warning: PostgreSQL connection failed. Please ensure PostgreSQL is running.
    echo Database URL: postgresql://postgres:Barbie198320132025@localhost:5432/admipaedia
)

REM Check Redis (optional)
echo Checking Redis connection...
python -c "import redis; redis.Redis(host='localhost', port=6379, db=0).ping()" 2>nul
if errorlevel 1 (
    echo Warning: Redis connection failed. Some features may not work properly.
)

REM Create logs directory
if not exist "logs" mkdir logs

REM Set debug environment variables
set FLASK_ENV=development
set FLASK_DEBUG=1
set PYTHONUNBUFFERED=1

echo.
echo Starting backend in debug mode...
echo Backend will be available at: http://localhost:5000
echo API endpoints at: http://localhost:5000/api/v1/
echo.
echo Press Ctrl+C to stop the server
echo ========================================

REM Start the debug server
python backend\debug_run.py

pause