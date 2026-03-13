"""Helpers to enforce competition/event ownership for multi-tenant scoping."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models import Competition, Event, Phase


def require_competition_owner(
  db: Session, competition_id: int, user_id: int
) -> Competition:
  competition = db.get(Competition, competition_id)
  if competition is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found")
  if getattr(competition, "user_id", None) != user_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found")
  return competition


def require_phase_owner(db: Session, phase_id: int, user_id: int) -> Phase:
  phase = db.get(Phase, phase_id)
  if phase is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
  require_competition_owner(db, phase.competition_id, user_id)
  return phase


def require_event_owner(db: Session, event_id: int, user_id: int) -> Event:
  event = db.get(Event, event_id)
  if event is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
  require_phase_owner(db, event.phase_id, user_id)
  return event
