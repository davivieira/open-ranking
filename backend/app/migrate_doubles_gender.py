"""
One-off migration: doubles, singles, gender, event modes.
- Extend Level enum: DOUBLE_RX, DOUBLE_SCALED, DOUBLE_BEGINNER
- Add new enums: gender, phaseeventmodes, eventtype, gendercategory
- athletes.gender (default MALE)
- phases.event_modes (default BOTH)
- events.event_type (default SINGLES), events.gender_category (default MIXED)
- scores.partner_id (nullable)

Run once per environment: python -m app.migrate_doubles_gender
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  # Extend level enum (each ADD VALUE auto-commits in PG)
  for val in ("DOUBLE_RX", "DOUBLE_SCALED", "DOUBLE_BEGINNER"):
    with engine.connect() as conn:
      try:
        conn.execute(text(f"ALTER TYPE level ADD VALUE IF NOT EXISTS '{val}'"))
        conn.commit()
      except Exception:
        conn.rollback()

  # Create new enum types (idempotent)
  for stmt in (
    "CREATE TYPE gender AS ENUM ('MALE', 'FEMALE')",
    "CREATE TYPE phaseeventmodes AS ENUM ('SINGLES_ONLY', 'DOUBLES_ONLY', 'BOTH')",
    "CREATE TYPE eventtype AS ENUM ('SINGLES', 'DOUBLES')",
    "CREATE TYPE gendercategory AS ENUM ('MALE', 'FEMALE', 'MIXED')",
  ):
    with engine.connect() as conn:
      try:
        conn.execute(text(stmt))
        conn.commit()
      except Exception:
        conn.rollback()

  with engine.begin() as conn:
    conn.execute(
      text(
        """
        ALTER TABLE athletes
        ADD COLUMN IF NOT EXISTS gender gender DEFAULT 'MALE'
        """
      )
    )
    conn.execute(
      text("UPDATE athletes SET gender = 'MALE' WHERE gender IS NULL")
    )
    conn.execute(
      text("ALTER TABLE athletes ALTER COLUMN gender SET NOT NULL")
    )
    conn.execute(text("ALTER TABLE athletes ALTER COLUMN gender DROP DEFAULT"))

  with engine.begin() as conn:
    conn.execute(
      text(
        """
        ALTER TABLE phases
        ADD COLUMN IF NOT EXISTS event_modes phaseeventmodes DEFAULT 'BOTH'
        """
      )
    )
    conn.execute(text("UPDATE phases SET event_modes = 'BOTH' WHERE event_modes IS NULL"))
    conn.execute(text("ALTER TABLE phases ALTER COLUMN event_modes SET NOT NULL"))
    conn.execute(text("ALTER TABLE phases ALTER COLUMN event_modes DROP DEFAULT"))

  with engine.begin() as conn:
    conn.execute(
      text(
        """
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS event_type eventtype DEFAULT 'SINGLES'
        """
      )
    )
    conn.execute(text("UPDATE events SET event_type = 'SINGLES' WHERE event_type IS NULL"))
    conn.execute(text("ALTER TABLE events ALTER COLUMN event_type SET NOT NULL"))
    conn.execute(text("ALTER TABLE events ALTER COLUMN event_type DROP DEFAULT"))
    conn.execute(
      text(
        """
        ALTER TABLE events
        ADD COLUMN IF NOT EXISTS gender_category gendercategory DEFAULT 'MIXED'
        """
      )
    )
    conn.execute(
      text("UPDATE events SET gender_category = 'MIXED' WHERE gender_category IS NULL")
    )
    conn.execute(text("ALTER TABLE events ALTER COLUMN gender_category SET NOT NULL"))
    conn.execute(text("ALTER TABLE events ALTER COLUMN gender_category DROP DEFAULT"))

  with engine.begin() as conn:
    conn.execute(
      text(
        """
        ALTER TABLE scores
        ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES athletes(id)
        """
      )
    )

  print("Migration complete: doubles, singles, gender, event modes.")


if __name__ == "__main__":
  run()
