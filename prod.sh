#!/usr/bin/env bash
# Open Ranking – Production deployment script
# Works locally with defaults. For Oracle Cloud: create .env.prod from .env.prod.example.

set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILES="-f docker-compose.yml -f docker-compose.prod.yml"

# Prefer `docker compose` (v2) over `docker-compose` (v1)
compose_cmd() {
  if docker compose version &>/dev/null; then
    docker compose $COMPOSE_FILES "$@"
  elif command -v docker-compose &>/dev/null; then
    docker-compose $COMPOSE_FILES "$@"
  else
    echo "Error: neither 'docker compose' nor 'docker-compose' found. Install Docker Compose." >&2
    exit 1
  fi
}

# Load .env.prod (required for prod - no default secrets)
load_env() {
  if [[ ! -f .env.prod ]]; then
    echo "Error: .env.prod not found. Copy .env.prod.example to .env.prod and set real secrets." >&2
    exit 1
  fi
  set -a
  # shellcheck source=/dev/null
  source .env.prod
  set +a
}

cmd_start() {
  load_env

  echo "Rebuilding images for PROD..."
  compose_cmd build

  echo "Starting Open Ranking in PROD mode (frontend + backend + Postgres)..."
  compose_cmd up -d

  echo "Waiting for backend to be ready (DB migrations run on startup)..."
  compose_cmd exec -T backend python -c "
import sys, time, urllib.request
for _ in range(60):
    try:
        urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)
        break
    except Exception:
        time.sleep(1)
else:
    sys.exit('Backend did not become ready in time')
"

  echo "Seeding initial admin user (if needed)..."
  compose_cmd exec -T backend python -m app.seed_admin || true

  echo "Open Ranking PROD stack is running."
  echo "  Frontend: http://localhost:3000  Backend API: http://localhost:8000"
  echo "  Use .env.prod for credentials (copy from .env.prod.example)."
  echo "  For Oracle Cloud: create .env.prod with real secrets, open firewall ports 3000 and 8000."
}

cmd_reset_db() {
  load_env
  echo "Stopping containers and REMOVING prod database volume..."
  compose_cmd down -v
  echo "Done. Run ./prod.sh start to recreate the DB with current credentials."
}

cmd_stop() {
  load_env
  echo "Stopping Open Ranking PROD stack..."
  compose_cmd down
  echo "Stopped."
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  load_env
  compose_cmd ps
}

cmd_logs() {
  load_env
  compose_cmd logs -f "${@:-}"
}

usage() {
  echo "Usage: $0 {start|stop|restart|reset-db|status|logs} [logs options...]"
  echo "  start   - build, start stack, wait for backend, seed admin (default)"
  echo "  stop    - stop all containers"
  echo "  restart - stop then start"
  echo "  reset-db - stop and remove DB volume (fixes auth errors after credential change)"
  echo "  status  - show container status"
  echo "  logs    - tail logs"
  exit 1
}

case "${1:-start}" in
  start)     cmd_start ;;
  stop)      cmd_stop ;;
  restart)   cmd_restart ;;
  reset-db)  cmd_reset_db ;;
  status)    cmd_status ;;
  logs)      shift; cmd_logs "$@" ;;
  -h|--help|help) usage ;;
  *)         usage ;;
esac
