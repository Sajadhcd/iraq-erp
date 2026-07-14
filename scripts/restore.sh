#!/bin/bash
# ============================================
# SIMS-ERP Database Restore Script (Linux)
# ============================================
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"

echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║     SIMS-ERP Database Restore            ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

if [ ! -d "$BACKUP_DIR" ]; then
  echo "ERROR: No backups directory found."
  exit 1
fi

echo "Available backups:"
ls -lt "$BACKUP_DIR"/*.dump 2>/dev/null || ls -lt "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  No backups found."
echo ""

read -p "Enter backup filename: " BACKUP_FILE

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
  echo "ERROR: File not found: $BACKUP_DIR/$BACKUP_FILE"
  exit 1
fi

echo ""
echo "WARNING: This will overwrite the current database!"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

# Load env
if [ -f "$PROJECT_ROOT/server/.env" ]; then
  source "$PROJECT_ROOT/server/.env"
fi

DB_URL="${DATABASE_URL:-postgresql://postgres:1234@localhost:5432/sims_db?schema=public}"
DB_NAME=$(echo "$DB_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')

echo ""
echo "Restoring database from $BACKUP_FILE..."

if [[ "$BACKUP_FILE" == *.dump ]]; then
  pg_restore -h localhost -p 5432 -U postgres -d "$DB_NAME" -c "$BACKUP_DIR/$BACKUP_FILE"
elif [[ "$BACKUP_FILE" == *.sql.gz ]]; then
  gunzip -c "$BACKUP_DIR/$BACKUP_FILE" | psql -h localhost -U postgres -d "$DB_NAME"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
  psql -h localhost -U postgres -d "$DB_NAME" -f "$BACKUP_DIR/$BACKUP_FILE"
else
  echo "ERROR: Unsupported backup format."
  exit 1
fi

echo ""
echo "✓ Restore complete!"
