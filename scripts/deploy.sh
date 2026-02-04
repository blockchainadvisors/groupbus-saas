#!/bin/bash
set -euo pipefail

echo "=== GroupBus SaaS Deployment ==="
echo "Started at: $(date)"

# Configuration
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${APP_DIR}/backups"
DB_NAME="${DB_NAME:-groupbus}"
DB_USER="${DB_USER:-groupbus}"

cd "$APP_DIR"

# Step 1: Backup database
echo "[1/6] Backing up database..."
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/db_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec gb-postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
echo "  Backup saved to: $BACKUP_FILE"

# Keep only last 30 backups
ls -t "${BACKUP_DIR}"/db_*.sql.gz 2>/dev/null | tail -n +31 | xargs -r rm

# Step 2: Pull latest code
echo "[2/6] Pulling latest code..."
git pull origin main

# Step 3: Install dependencies
echo "[3/6] Installing dependencies..."
npm ci --production=false

# Step 4: Run migrations
echo "[4/6] Running database migrations..."
npx prisma migrate deploy

# Step 5: Build
echo "[5/6] Building application..."
npm run build

# Build workers
npx tsc -p tsconfig.workers.json 2>/dev/null || echo "  Workers build skipped (no tsconfig.workers.json)"

# Step 6: Reload PM2
echo "[6/6] Reloading PM2 processes..."
pm2 reload ecosystem.config.js --update-env

echo ""
echo "=== Deployment complete at $(date) ==="
pm2 status
