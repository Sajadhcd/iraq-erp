@echo off
REM ============================================
REM SIMS-ERP Production Start Script (Windows)
REM ============================================
setlocal
title SIMS-ERP Production

cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     SIMS-ERP Production Server           ║
echo  ╚══════════════════════════════════════════╝
echo.

REM Check if PM2 is installed
call pm2 --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo Installing PM2 globally...
  call npm install -g pm2
)

echo Starting production services...
cd server
call pm2 start ..\ecosystem.config.js
cd ..
call pm2 start npm --name sims-frontend -- start

echo.
echo Saving PM2 process list...
call pm2 save

echo.
echo Setting up PM2 startup script...
call pm2 startup 2>nul

echo.
echo ╔══════════════════════════════════════════╗
echo ║  Services are running!                    ║
echo ║  Frontend: http://localhost:3000          ║
echo ║  Backend:  http://localhost:3001/api      ║
echo ║                                          ║
echo ║  PM2 Commands:                           ║
echo ║  pm2 status     - View status            ║
echo ║  pm2 logs       - View logs              ║
echo ║  pm2 restart all - Restart all           ║
echo ║  pm2 stop all   - Stop all               ║
echo ╚══════════════════════════════════════════╝
echo.
pause
endlocal
