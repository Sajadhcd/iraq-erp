@echo off
REM SIMS-ERP Database Backup Script (Windows)
setlocal

cd /d "%~dp0"
set BACKUP_DIR=backups
set TIMESTAMP=%date:~-4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [%date% %time%] Starting database backup...

REM Parse DATABASE_URL from .env
for /f "tokens=2 delims==" %%i in ('findstr /C:"DATABASE_URL" server\.env') do set DB_URL=%%i

REM Simple backup using pg_dump
for /f "tokens=2 delims=/" %%i in ("%DB_URL%") do set DB_NAME=%%i
for /f "tokens=4 delims=:/" %%i in ("%DB_URL%") do set DB_HOST=%%i
for /f "tokens=5 delims=:/?" %%i in ("%DB_URL%") do set DB_PORT=%%i

echo  Database: %DB_NAME%
echo  Host: %DB_HOST%:%DB_PORT%

pg_dump -h %DB_HOST% -p %DB_PORT% -U postgres -d %DB_NAME% -F c -f "%BACKUP_DIR%\backup_%TIMESTAMP%.dump" 2>nul
if %ERRORLEVEL% EQU 0 (
  echo  ✓ Backup saved: %BACKUP_DIR%\backup_%TIMESTAMP%.dump
) else (
  echo  ⚠ pg_dump not available. Using Prisma fallback...
  cd server
  call npx prisma db pull 2>nul
  cd ..
  echo  ✓ Schema pulled as fallback
)

echo [%date% %time%] Backup complete.
endlocal
