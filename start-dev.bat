@echo off
title MedConnect - Hospital Management System
echo ========================================================
echo   Starting MedConnect Local Development Environment...
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking backend dependencies...
cd backend
if not exist node_modules (
  echo Installing backend dependencies...
  call npm.cmd install
)

echo [2/3] Checking frontend dependencies...
cd ..\frontend
if not exist node_modules (
  echo Installing frontend dependencies...
  call npm.cmd install
)

echo [3/3] Launching Backend & Frontend servers...
cd ..
start "MedConnect Backend API (Port 5000)" cmd /k "cd /d %~dp0backend && npm.cmd start"
timeout /t 3 >nul
start "MedConnect Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo ========================================================
echo   MedConnect is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo ========================================================
timeout /t 3 >nul
start http://localhost:5173
