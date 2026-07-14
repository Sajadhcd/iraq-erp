@echo off
REM ============================================
REM SIMS-ERP Automatic Installation Script (Windows)
REM ============================================
setlocal
title SIMS-ERP Installer

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     SIMS-ERP Installation Wizard         ║
echo  ║     Enterprise Resource Planning          ║
echo  ╚══════════════════════════════════════════╝
echo.

cd /d "%~dp0\.."

REM Step 1: Check Prerequisites
echo [1/7] Checking prerequisites...

where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  ERROR: Node.js is not installed.
  echo  Please install Node.js 20+ from https://nodejs.org
  pause
  exit /b 1
)
echo  ✓ Node.js found

where pg_dump >nul 2>&1
if %ERRORLEVEL% neq 0 (
  echo  ⚠ PostgreSQL client tools not found. Backups may not work.
)

REM Step 2: Install Dependencies
echo.
echo [2/7] Installing dependencies...
cd server
call npm install
cd ..
call npm install

REM Step 3: Configure Environment
echo.
echo [3/7] Configuring environment...
if not exist server\.env (
  copy server\.env.example server\.env >nul 2>&1
  if not exist server\.env (
    echo # SIMS-ERP Environment Configuration > server\.env
    echo DATABASE_URL="postgresql://postgres:1234@localhost:5432/sims_db?schema=public" >> server\.env
    echo JWT_SECRET="sims-production-secret-key-change-in-production-2026" >> server\.env
    echo JWT_EXPIRY="24h" >> server\.env
    echo PORT=3001 >> server\.env
    echo NODE_ENV=development >> server\.env
    echo CORS_ORIGINS="http://localhost:3000" >> server\.env
    echo THROTTLE_TTL=60000 >> server\.env
    echo THROTTLE_LIMIT=60 >> server\.env
    echo HELMET_ENABLED=true >> server\.env
    echo COMPRESSION_ENABLED=true >> server\.env
    echo LOG_LEVEL=debug >> server\.env
  )
  echo  ✓ Environment file created
) else (
  echo  ✓ Environment file already exists
)

REM Step 4: Generate Prisma Client
echo.
echo [4/7] Setting up database...
cd server
call npx prisma generate
if %ERRORLEVEL% neq 0 (
  echo  ERROR: Prisma generate failed.
  pause
  exit /b 1
)
echo  ✓ Prisma client generated

REM Step 5: Run Migrations
echo.
echo [5/7] Running database migrations...
call npx prisma migrate deploy
if %ERRORLEVEL% neq 0 (
  echo  ⚠ Some migrations may have issues. Continuing...
)

REM Step 6: Seed Database
echo.
echo [6/7] Seeding database...
call npx prisma db seed
if %ERRORLEVEL% neq 0 (
  echo  ⚠ Seeding had issues. You may need to run 'npx prisma db seed' manually.
)
cd ..

REM Step 7: Build
echo.
echo [7/7] Building for production...
cd server
call npm run build
cd ..
call npm run build

echo.
echo ╔══════════════════════════════════════════╗
echo ║     Installation Complete!                ║
echo ╠══════════════════════════════════════════╣
echo ║                                          ║
echo ║  Default Login:                          ║
echo ║  Email: admin@system.com                 ║
echo ║  Password: 123456                        ║
echo ║                                          ║
echo ║  Start with: start.bat                   ║
echo ║  Or: scripts\deploy-windows.bat          ║
echo ║                                          ║
echo ╚══════════════════════════════════════════╝
echo.
pause
endlocal
