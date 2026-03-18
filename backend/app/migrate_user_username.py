"""
Migration: add username to users; backfill from email.
Idempotent; safe to run on startup.
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(text(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255)"
    ))
    conn.commit()

  with engine.connect() as conn:
    # Backfill: set username from email where username is null
    conn.execute(text("""
      UPDATE users SET username = email WHERE username IS NULL AND email IS NOT NULL
    """))
    conn.commit()

  with engine.connect() as conn:
    # Add unique constraint on username if not already present
    r = conn.execute(text("""
      SELECT 1 FROM pg_constraint
      WHERE conname = 'users_username_key' AND conrelid = 'users'::regclass
    """))
    if r.fetchone() is None:
      conn.execute(text(
        "ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)"
      ))
    conn.commit()

  try:
    with engine.connect() as conn:
      conn.execute(text("""
        ALTER TABLE users ALTER COLUMN email DROP NOT NULL
      """))
      conn.commit()
  except Exception:
    pass


if __name__ == "__main__":
  run()
