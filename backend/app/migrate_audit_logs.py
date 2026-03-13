"""
One-off migration: create audit_logs table if not present.
Run once per environment: python -m app.migrate_audit_logs
"""
from sqlalchemy import text

from .database import engine


def run() -> None:
  with engine.connect() as conn:
    conn.execute(
      text(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id),
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(50) NOT NULL,
          resource_id INTEGER,
          details TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
        """
      )
    )
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_user_id ON audit_logs(user_id)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_audit_logs_created_at ON audit_logs(created_at)"))
    conn.commit()
  print("Migration complete: audit_logs table created if not exists.")


if __name__ == "__main__":
  run()
