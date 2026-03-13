#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Rebuilding images for DEV (frontend + backend)..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

echo "Starting Open Ranking in DEV mode (frontend + backend + Postgres dev DB)..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

echo "Seeding initial admin user (if needed)..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml exec backend python -m app.seed_admin || true

echo "Tailing logs (Ctrl+C to stop viewing, stack keeps running)..."
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f

