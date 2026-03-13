"""
Migration: add level column to athlete_history.
Run once per environment: python -m app.migrate_athlete_history_level
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    # Use the same enum type as scores.level; for most databases this is just VARCHAR.
    conn.execute(
      text(
        "ALTER TABLE athlete_history "
        "ADD COLUMN IF NOT EXISTS level VARCHAR(50)"
      )
    )
    conn.commit()
  print("Migration complete: athlete_history.level added (nullable).")


if __name__ == "__main__":
  run()

