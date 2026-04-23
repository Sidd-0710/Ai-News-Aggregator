@echo off
echo.
echo ========================================
echo AI News Aggregator - Quick Start
echo ========================================
echo.
echo Step 1: Make sure Ollama is running!
echo Visit http://localhost:11434 to check
echo.
pause

echo.
echo Step 2: Starting Backend (Terminal 1)...
cd "%CD%\backend"
start cmd /k "npm start"

echo.
echo Step 3: Starting Frontend (Terminal 2)...
timeout /t 3 /nobreak
cd "%CD%\frontend"
start cmd /k "npm start"

echo.
echo ========================================
echo Both terminals are starting!
echo Frontend will open at http://localhost:3000
echo Backend running at http://localhost:5000
echo ========================================
echo.
