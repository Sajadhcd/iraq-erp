#!/bin/bash
# ============================================
# SIMS-ERP Automatic Installation Script (Linux/Mac)
# ============================================
set -e

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     SIMS-ERP Installation Wizard         ║"
echo "  ║     Enterprise Resource Planning          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# Step 1: Check Prerequisites
echo "[1/7] Checking prerequisites..."

if ! command -v node &> /dev/null; then
  echo "  ERROR: Node.js is not installed."
  echo "  Please install Node.js 20+ from https://nodejs.org"
  exit 1
fi
echo "  ✓ Node.js: $(node --version)"

if ! command -v npm &> /dev/null; then
  echo "  ERROR: npm is not installed."
  exit 1
fi
echo "  ✓ npm: $(npm --version)"

if ! command -v psql &> /dev/null; then
  echo "  ⚠ PostgreSQL client not found. Install for backup support."
fi

# Step 2: Install Dependencies
echo ""
echo "[2/7] Installing dependencies..."
cd server
npm install
cd ..
npm install

# Step 3: Configure Environment
echo ""
echo "[3/7] Configuring environment..."
if [ ! -f server/.env ]; then
  cat > server/.env << 'EOF'
DATABASE_URL="postgresql://postgres:1234@localhost:5432/sims_db?schema=public"
JWT_SECRET="sims-production-secret-key-change-in-production-2026"
JWT_EXPIRY="24h"
PORT=3001
NODE_ENV=development
CORS_ORIGINS="http://localhost:3000"
THROTTLE_TTL=60000
THROTTLE_LIMIT=60
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
LOG_LEVEL=debug
EOF
  echo "  ✓ Environment file created"
else
  echo "  ✓ Environment file already exists"
fi

# Step 4: Generate Prisma Client
echo ""
echo "[4/7] Setting up database..."
cd server
npx prisma generate
echo "  ✓ Prisma client generated"

# Step 5: Run Migrations
echo ""
echo "[5/7] Running database migrations..."
npx prisma migrate deploy || echo "  ⚠ Migration issues detected. Continuing..."

# Step 6: Seed Database
echo ""
echo "[6/7] Seeding database..."
npx prisma db seed || echo "  ⚠ Seeding issues. Run 'npx prisma db seed' manually."
cd ..

# Step 7: Build
echo ""
echo "[7/7] Building for production..."
cd server
npm run build
cd ..
npm run build

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     Installation Complete!                ║"
echo "╠══════════════════════════════════════════╣"
echo "║                                          ║"
echo "║  Default Login:                          ║"
echo "║  Email: admin@system.com                 ║"
echo "║  Password: 123456                        ║"
echo "║                                          ║"
echo "║  Start with: ./start.sh                  ║"
echo "║  Or: ./scripts/deploy-linux.sh           ║"
echo "║                                          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
