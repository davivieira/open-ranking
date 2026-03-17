import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .routes.athletes import router as athletes_router
from .routes.audit import router as audit_router
from .routes.auth import router as auth_router
from .routes.competitions import router as competitions_router
from .routes.events import router as events_router
from .routes.export_import import router as export_import_router
from .routes.leaderboard import router as leaderboard_router
from .routes.scores import router as scores_router

app = FastAPI(title="Open Ranking API", version="0.1.0")

def _cors_origins() -> list[str]:
  raw = os.getenv("CORS_ORIGINS", "").strip()
  if not raw:
    # Local dev defaults. In prod, set CORS_ORIGINS explicitly.
    return ["http://localhost:3000", "http://localhost:5173"]
  return [o.strip() for o in raw.split(",") if o.strip()]

app.add_middleware(
  CORSMiddleware,
  allow_origins=_cors_origins(),
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
  # For Phase 1 we create tables directly. In later phases we will switch to Alembic migrations.
  Base.metadata.create_all(bind=engine)
  # Time/points score migration: add time_seconds, reps_points; migrate and drop raw_score if present
  from .migrate_score_time_points import run as run_score_migration
  from .migrate_event_finished import run as run_event_finished_migration
  from .migrate_user_ownership import run as run_user_ownership_migration
  from .migrate_public_slug import run as run_public_slug_migration
  from .migrate_athlete_podium_rank import run as run_athlete_podium_rank_migration
  from .migrate_athlete_history_level import run as run_athlete_history_level_migration
  try:
    run_score_migration()
  except Exception:
    pass
  try:
    run_event_finished_migration()
  except Exception:
    pass
  try:
    run_user_ownership_migration()
  except Exception:
    pass
  try:
    run_public_slug_migration()
  except Exception:
    pass
  try:
    run_athlete_podium_rank_migration()
  except Exception:
    pass
  try:
    run_athlete_history_level_migration()
  except Exception:
    pass
  try:
    from .migrate_audit_logs import run as run_audit_logs_migration
    run_audit_logs_migration()
  except Exception:
    pass
  try:
    from .migrate_user_role_viewer import run as run_user_role_viewer_migration
    run_user_role_viewer_migration()
  except Exception:
    pass

  # Seed an initial admin user when credentials are provided (idempotent).
  if os.getenv("INITIAL_ADMIN_EMAIL") and os.getenv("INITIAL_ADMIN_PASSWORD"):
    try:
      from .seed_admin import seed_admin
      seed_admin()
    except Exception:
      pass


app.include_router(athletes_router)
app.include_router(audit_router)
app.include_router(auth_router)
app.include_router(competitions_router)
app.include_router(events_router)
app.include_router(export_import_router)
app.include_router(leaderboard_router)
app.include_router(scores_router)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
  db.execute(text("SELECT 1"))
  return {"status": "ok"}

