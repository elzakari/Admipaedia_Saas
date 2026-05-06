@echo off
echo Starting ADMIPAEDIA Debug Environment...
echo.

REM Check if we're in PowerShell and suggest the correct command
if "%PSModulePath%" NEQ "" (
    echo You're running in PowerShell. Please use: .\debug_launch.bat
    echo Or run this batch file directly from Command Prompt
    pause
    exit /b 1
)

REM Run the debug launch script
call debug_launch.bat