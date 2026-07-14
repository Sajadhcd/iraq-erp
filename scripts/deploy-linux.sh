#!/bin/bash
# SIMS-ERP Production Build & Deploy Script (Linux)
set -e

echo "========================================="
echo " SIMS-ERP Production Deployment"
echo "========================================="

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
LOG_DIR="$PROJECT_ROOT/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# 1. Pre-deployment checks
echo "[1/8] Pre-deployment checks..."
if ! command -v node &> /dev/null; then
  echo "ERROR: Node.js is not installed"
  exit 1
fi
if ! command -v docker &> /dev/null; then
  echo "ERROR: Docker is not installed"
  exit 1
fi
echo "  ✓ Node.js: $(node --version)"
echo "  ✓ Docker: $(docker --version)"

# 2. Backup current database
echo "[2/8] Backing up database..."
cd "$PROJECT_ROOT/server"
if [ -f .env ]; then
  source .env
  PGPASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\([^@]*\)@.*/\1/p')
  DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
  pg_dump -h "$DB_HOST" -p "$DB_PORT" -U postgres -d "$DB_NAME" | gzip > "$BACKUP_DIR/pre_deploy_${TIMESTAMP}.sql.gz" 2>/dev/null || echo "  ⚠ Backup skipped (pg_dump not available)"
else
  echo "  ⚠ No .env found, skipping backup"
fi

# 3. Install dependencies
echo "[3/8] Installing dependencies..."
cd "$PROJECT_ROOT/server"
npm ci --production=false
cd "$PROJECT_ROOT"
npm ci

# 4. Generate Prisma client
echo "[4/8] Generating Prisma client..."
cd "$PROJECT_ROOT/server"
npx prisma generate

# 5. Run migrations
echo "[5/8] Running database migrations..."
npx prisma migrate deploy || echo "  ⚠ Migrations had issues (check manually)"

# 6. Build backend
echo "[6/8] Building backend..."
npm run build

# 7. Build frontend
echo "[7/8] Building frontend..."
cd "$PROJECT_ROOT"
npm run build

# 8. Start with Docker
echo "[8/8] Starting services..."
cd "$PROJECT_ROOT"
docker-compose down 2>/dev/null || true
docker-compose up -d --build

echo ""
echo "========================================="
echo " Deployment Complete!"
echo "========================================="
echo " Frontend: http://localhost:3000"
echo " Backend:  http://localhost:3001/api"
echo " Health:   http://localhost:3001/api/health"
echo " Monitor:  http://localhost:3001/api/monitoring/dashboard"
echo "========================================="
