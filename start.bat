@echo off
title SIMS Project
cd /d "%~dp0"

echo Starting Backend...
start "SIMS Backend" cmd /k "cd /d %~dp0server && npm.cmd run start:dev"

echo Starting Frontend...
start "SIMS Frontend" cmd /k "cd /d %~dp0 && npm.cmd run dev"

echo.
echo Done! Opening browser...
timeout /t 5 /nobreak >nul
start http://localhost:3000
