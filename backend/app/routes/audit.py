from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..auth.deps import get_current_admin
from ..database import get_db
from ..models import AuditLog, User
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["audit"])


class AuditLogEntry(BaseModel):
  id: int
  user_id: int
  user_email: str
  action: str
  resource_type: str
  resource_id: int | None
  details: str | None
  created_at: str

  class Config:
    from_attributes = True


@router.get("/audit-logs", response_model=list[AuditLogEntry])
def list_audit_logs(
  limit: int = Query(default=100, ge=1, le=500),
  offset: int = Query(default=0, ge=0),
  user_id: int | None = Query(default=None),
  resource_type: str | None = Query(default=None),
  action: str | None = Query(default=None),
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> list[AuditLogEntry]:
  q = db.query(AuditLog).order_by(AuditLog.created_at.desc())
  if user_id is not None:
    q = q.filter(AuditLog.user_id == user_id)
  if resource_type:
    q = q.filter(AuditLog.resource_type == resource_type)
  if action:
    q = q.filter(AuditLog.action == action)
  rows = q.offset(offset).limit(limit).all()
  users = {u.id: u.email for u in db.query(User).filter(User.id.in_({r.user_id for r in rows})).all()}
  return [
    AuditLogEntry(
      id=r.id,
      user_id=r.user_id,
      user_email=users.get(r.user_id, ""),
      action=r.action,
      resource_type=r.resource_type,
      resource_id=r.resource_id,
      details=r.details,
      created_at=r.created_at.isoformat() if r.created_at else "",
    )
    for r in rows
  ]
