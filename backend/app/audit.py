"""Audit logging helper: write entries after mutations."""
from sqlalchemy.orm import Session

from .models import AuditLog


def audit_log(
  db: Session,
  user_id: int,
  action: str,
  resource_type: str,
  resource_id: int | None = None,
  details: str | None = None,
) -> None:
  entry = AuditLog(
    user_id=user_id,
    action=action,
    resource_type=resource_type,
    resource_id=resource_id,
    details=details,
  )
  db.add(entry)
  db.flush()
