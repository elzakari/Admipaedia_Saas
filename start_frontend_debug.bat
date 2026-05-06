@echo off
echo ========================================
echo ADMIPAEDIA Frontend Debug Mode Startup
echo ========================================

REM Check if node_modules exists
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Set debug environment variables
set NODE_ENV=development
set REACT_APP_DEBUG=true
set REACT_APP_API_URL=http://localhost:5000/api/v1
set REACT_APP_WS_URL=ws://localhost:5000
set GENERATE_SOURCEMAP=true

echo.
echo Starting frontend in debug mode...
echo Frontend will be available at: http://localhost:5173
echo API proxy target: http://localhost:5000/api/v1
echo.
echo Debug features enabled:
echo - Hot module replacement
echo - Source maps
echo - React DevTools
echo - Performance monitoring
echo - Error boundaries
echo.
echo Press Ctrl+C to stop the server
echo ========================================

REM Start the frontend development server
cd frontend
npm run dev

pause