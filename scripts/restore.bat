@echo off
REM ============================================
REM SIMS-ERP Database Restore Script (Windows)
REM ============================================
setlocal
cd /d "%~dp0"

set BACKUP_DIR=backups

echo =========================================
echo  SIMS-ERP Database Restore
echo =========================================
echo.

if not exist "%BACKUP_DIR%" (
  echo ERROR: No backups directory found.
  pause
  exit /b 1
)

echo Available backups:
echo.
dir /b /o-d "%BACKUP_DIR%\*.dump" 2>nul
dir /b /o-d "%BACKUP_DIR%\*.sql.gz" 2>nul
dir /b /o-d "%BACKUP_DIR%\*.sql" 2>nul
echo.

set /p BACKUP_FILE="Enter backup filename: "

if not exist "%BACKUP_DIR%\%BACKUP_FILE%" (
  echo ERROR: File not found: %BACKUP_DIR%\%BACKUP_FILE%
  pause
  exit /b 1
)

echo.
echo WARNING: This will overwrite the current database!
set /p CONFIRM="Are you sure? (YES/no): "
if /i not "%CONFIRM%"=="YES" (
  echo Restore cancelled.
  pause
  exit /b 0
)

echo.
echo Restoring database from %BACKUP_FILE%...

for /f "tokens=2 delims==" %%i in ('findstr /C:"DATABASE_URL" server\.env') do set DB_URL=%%i

if "%BACKUP_FILE:~-5%"==".dump" (
  for /f "tokens=2 delims=/" %%i in ("%DB_URL%") do set DB_NAME=%%i
  pg_restore -h localhost -p 5432 -U postgres -d "%DB_NAME%" -c "%BACKUP_DIR%\%BACKUP_FILE%"
) else (
  echo Unsupported backup format. Use .dump files from pg_dump.
)

echo.
echo Restore complete!
pause
endlocal
