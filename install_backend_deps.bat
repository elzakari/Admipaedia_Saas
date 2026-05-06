@echo off
echo Installing Backend Dependencies...
echo.

REM Activate virtual environment
call venv_py311_new\Scripts\activate.bat

REM Install backend requirements
echo Installing backend requirements...
pip install -r backend\requirements.txt

echo.
echo Backend dependencies installed successfully!
pause