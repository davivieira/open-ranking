"""
One-off migration: add athlete_history.podium_rank (nullable INTEGER).
Run once per environment: python -m app.migrate_athlete_podium_rank
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(
      text(
        "ALTER TABLE athlete_history "
        "ADD COLUMN IF NOT EXISTS podium_rank INTEGER"
      )
    )
    conn.commit()
  print("Migration complete: athlete_history.podium_rank added (nullable).")


if __name__ == "__main__":
  run()

