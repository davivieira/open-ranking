"""
Migration: add user_id to competitions and athletes; backfill from first user;
replace global slug unique with (user_id, slug). Idempotent; safe to run on startup.
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    # Add columns if not exists (nullable first)
    conn.execute(text(
      "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)"
    ))
    conn.commit()
  with engine.connect() as conn:
    conn.execute(text(
      "ALTER TABLE athletes ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id)"
    ))
    conn.commit()

  # Backfill: set user_id to first user where currently null
  with engine.connect() as conn:
    conn.execute(text("""
      UPDATE competitions SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
      WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users LIMIT 1)
    """))
    conn.commit()
  with engine.connect() as conn:
    conn.execute(text("""
      UPDATE athletes SET user_id = (SELECT id FROM users ORDER BY id LIMIT 1)
      WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users LIMIT 1)
    """))
    conn.commit()

  # Set NOT NULL only when no nulls remain (e.g. empty tables or after backfill)
  with engine.connect() as conn:
    r = conn.execute(text("SELECT 1 FROM competitions WHERE user_id IS NULL LIMIT 1"))
    if r.fetchone() is None:
      conn.execute(text("ALTER TABLE competitions ALTER COLUMN user_id SET NOT NULL"))
    conn.commit()
  with engine.connect() as conn:
    r = conn.execute(text("SELECT 1 FROM athletes WHERE user_id IS NULL LIMIT 1"))
    if r.fetchone() is None:
      conn.execute(text("ALTER TABLE athletes ALTER COLUMN user_id SET NOT NULL"))
    conn.commit()

  # Replace slug uniqueness with (user_id, slug)
  with engine.connect() as conn:
    conn.execute(text(
      "ALTER TABLE competitions DROP CONSTRAINT IF EXISTS competitions_slug_key"
    ))
    conn.commit()
  with engine.connect() as conn:
    # Add new unique constraint if not exists (PostgreSQL has no IF NOT EXISTS for constraints)
    r = conn.execute(text("""
      SELECT 1 FROM pg_constraint
      WHERE conname = 'uq_competition_user_slug' AND conrelid = 'competitions'::regclass
    """))
    if r.fetchone() is None:
      conn.execute(text(
        "ALTER TABLE competitions ADD CONSTRAINT uq_competition_user_slug UNIQUE (user_id, slug)"
      ))
    conn.commit()


if __name__ == "__main__":
  run()
