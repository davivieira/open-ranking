"""
Migration: add weight_kg to scores (load-based results, same ranking as reps/points).
Idempotent; safe to run on startup.
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(text("ALTER TABLE scores ADD COLUMN IF NOT EXISTS weight_kg DOUBLE PRECISION"))
    conn.commit()


if __name__ == "__main__":
  run()
