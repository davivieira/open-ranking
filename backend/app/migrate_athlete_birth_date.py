"""
One-off migration: add athletes.birth_date (DATE), drop athletes.age.
Run once per environment: python -m app.migrate_athlete_birth_date
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(text("ALTER TABLE athletes ADD COLUMN IF NOT EXISTS birth_date DATE"))
    conn.commit()
  with engine.connect() as conn:
    conn.execute(text("ALTER TABLE athletes DROP COLUMN IF EXISTS age"))
    conn.commit()
  print("Migration complete: athletes.birth_date added, athletes.age dropped.")


if __name__ == "__main__":
  run()
