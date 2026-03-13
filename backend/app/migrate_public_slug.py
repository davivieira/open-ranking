"""
Migration: add public_slug to competitions. Backfill slug || '-' || id. Idempotent; safe to run on startup.
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(text(
      "ALTER TABLE competitions ADD COLUMN IF NOT EXISTS public_slug VARCHAR(255)"
    ))
    conn.commit()

  # Backfill: public_slug = slug || '-' || id
  with engine.connect() as conn:
    conn.execute(text("""
      UPDATE competitions SET public_slug = slug || '-' || id WHERE public_slug IS NULL
    """))
    conn.commit()

  # Set NOT NULL when no nulls remain
  with engine.connect() as conn:
    r = conn.execute(text("SELECT 1 FROM competitions WHERE public_slug IS NULL LIMIT 1"))
    if r.fetchone() is None:
      conn.execute(text("ALTER TABLE competitions ALTER COLUMN public_slug SET NOT NULL"))
    conn.commit()

  # Add unique constraint if not exists
  with engine.connect() as conn:
    r = conn.execute(text("""
      SELECT 1 FROM pg_constraint WHERE conname = 'competitions_public_slug_key' AND conrelid = 'competitions'::regclass
    """))
    if r.fetchone() is None:
      conn.execute(text(
        "ALTER TABLE competitions ADD CONSTRAINT competitions_public_slug_key UNIQUE (public_slug)"
      ))
    conn.commit()

if __name__ == "__main__":
  run()
