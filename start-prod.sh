#!/bin/bash
# ============================================
# SIMS-ERP Production Start Script (Linux)
# ============================================
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     SIMS-ERP Production Server           ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2 globally..."
  npm install -g pm2
fi

echo "Starting production services..."
pm2 start ecosystem.config.js

echo ""
echo "Saving PM2 process list..."
pm2 save

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  Services are running!                    ║"
echo "║  Frontend: http://localhost:3000          ║"
echo "║  Backend:  http://localhost:3001/api      ║"
echo "║                                          ║"
echo "║  PM2 Commands:                           ║"
echo "║  pm2 status     - View status            ║"
echo "║  pm2 logs       - View logs              ║"
echo "║  pm2 restart all - Restart all           ║"
echo "║  pm2 stop all   - Stop all               ║"
echo "╚══════════════════════════════════════════╝"
echo ""
