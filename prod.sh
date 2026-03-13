#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Rebuilding images for PROD (frontend + backend)..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

echo "Starting Open Ranking in PROD mode (frontend + backend + Postgres prod DB)..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
echo "Seeding initial admin user (if needed)..."
docker-compose -f docker-compose.yml -f docker-compose.prod.yml exec backend python -m app.seed_admin || true
echo "Open Ranking PROD stack is running in the background."

