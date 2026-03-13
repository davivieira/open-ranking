"""
Migration: add time_seconds and reps_points to scores, migrate raw_score to reps_points, drop raw_score.
Idempotent: safe to run on every startup. Run manually with: python -m app.migrate_score_time_points
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scores ADD COLUMN IF NOT EXISTS time_seconds DOUBLE PRECISION"))
    conn.commit()
  with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scores ADD COLUMN IF NOT EXISTS reps_points DOUBLE PRECISION"))
    conn.commit()
  # Only migrate and drop raw_score if the column still exists
  with engine.connect() as conn:
    r = conn.execute(text("""
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'scores' AND column_name = 'raw_score'
    """))
    if r.fetchone():
      conn.execute(text("UPDATE scores SET reps_points = raw_score WHERE raw_score IS NOT NULL"))
      conn.commit()
  with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scores DROP COLUMN IF EXISTS raw_score"))
    conn.commit()


if __name__ == "__main__":
  run()
