@echo off
REM SIMS-ERP Production Build & Deploy Script (Windows)
echo =========================================
echo  SIMS-ERP Production Deployment
echo =========================================

cd /d "%~dp0"

echo [1/7] Installing dependencies...
cd server
call npm ci
cd ..
call npm ci

echo [2/7] Generating Prisma client...
cd server
call npx prisma generate

echo [3/7] Running database migrations...
call npx prisma migrate deploy
cd ..

echo [4/7] Building backend...
cd server
call npm run build
cd ..

echo [5/7] Building frontend...
call npm run build

echo [6/7] Backing up database...
if exist server\.env (
  for /f "tokens=*" %%i in ('findstr "DATABASE_URL" server\.env') do set DB_URL=%%i
  echo  Database backup started...
)

echo [7/7] Starting services with PM2...
cd server
call pm2 start dist\main.js --name sims-backend -i max
cd ..
call pm2 start npm --name sims-frontend -- start

echo.
echo =========================================
echo  Deployment Complete!
echo =========================================
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:3001/api
echo  Health:   http://localhost:3001/api/health
echo =========================================
