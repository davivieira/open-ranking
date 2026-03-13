"""
Migration: add is_finished to events. Idempotent; safe to run on startup.
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(text(
      "ALTER TABLE events ADD COLUMN IF NOT EXISTS is_finished BOOLEAN NOT NULL DEFAULT false"
    ))
    conn.commit()


if __name__ == "__main__":
  run()
