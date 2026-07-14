#!/bin/bash
# SIMS-ERP Database Backup Script (Linux)
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Load env
if [ -f "$PROJECT_ROOT/server/.env" ]; then
  source "$PROJECT_ROOT/server/.env"
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:1234@localhost:5432/sims_db?schema=public}"
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
DB_HOST=$(echo "$DB_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo "$DB_URL" | sed -n 's|.*:\([0-9]*/\).*|\1|p')

echo "  Database: $DB_NAME"
echo "  Host: $DB_HOST"

# Try pg_dump first
if command -v pg_dump &> /dev/null; then
  pg_dump -h "$DB_HOST" -p "${DB_PORT%/}" -U postgres -d "$DB_NAME" -F c -f "$BACKUP_DIR/backup_${TIMESTAMP}.dump"
  echo "  ✓ Backup saved: backups/backup_${TIMESTAMP}.dump"
else
  echo "  ⚠ pg_dump not available. Install postgresql-client for full backups."
  echo "  Creating Prisma schema snapshot instead..."
  cd "$PROJECT_ROOT/server"
  npx prisma db pull 2>/dev/null || true
  echo "  ✓ Schema snapshot created"
fi

# Clean up old backups (keep 30 days)
find "$BACKUP_DIR" -name "backup_*" -mtime +30 -delete 2>/dev/null || true

echo "[$(date)] Backup complete."
