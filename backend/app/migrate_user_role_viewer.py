"""
One-off migration: add VIEWER to user role enum (PostgreSQL).
Run once per environment: python -m app.migrate_user_role_viewer
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    # PostgreSQL: alter enum type to add new value. Type name may be userrole.
    try:
      conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'VIEWER'"))
    except Exception:
      try:
        conn.execute(text("ALTER TYPE userrole ADD VALUE 'VIEWER'"))
      except Exception:
        pass
    conn.commit()
  print("Migration complete: USER_ROLE enum may have been updated for VIEWER.")


if __name__ == "__main__":
  run()
