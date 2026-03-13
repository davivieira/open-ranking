import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..audit import audit_log
from ..auth.deps import get_current_admin
from ..database import get_db
from ..models import Competition, Event, Phase, User
from ..schemas.import_schema import ImportPayload

router = APIRouter(prefix="/admin", tags=["export_import"])


@router.post("/import")
def import_data(
  payload: ImportPayload,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> dict:
  """Import competitions with phases and events. Does not import scores or athletes."""
  created_competitions = 0
  created_phases = 0
  created_events = 0
  try:
    for comp_in in payload.competitions:
      existing = (
        db.query(Competition)
        .filter(Competition.user_id == current_user.id, Competition.slug == comp_in.slug)
        .first()
      )
      if existing:
        raise HTTPException(
          status_code=status.HTTP_400_BAD_REQUEST,
          detail=f"A competition with slug '{comp_in.slug}' already exists",
        )
      for _ in range(10):
        short_id = secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8]
        public_slug = f"{comp_in.slug}-{short_id}"
        if db.query(Competition).filter(Competition.public_slug == public_slug).first() is None:
          break
      else:
        public_slug = f"{comp_in.slug}-{secrets.token_hex(4)}"

      competition = Competition(
        user_id=current_user.id,
        name=comp_in.name,
        slug=comp_in.slug,
        public_slug=public_slug,
        type=comp_in.type,
        year=comp_in.year,
        description=comp_in.description,
        is_active=True,
      )
      db.add(competition)
      db.flush()
      created_competitions += 1

      for phase_ord, phase_in in enumerate(comp_in.phases):
        code = phase_in.code or str(int(datetime.now(timezone.utc).timestamp() * 1000) + phase_ord)
        existing_phase = (
          db.query(Phase)
          .filter(Phase.competition_id == competition.id, Phase.code == code)
          .first()
        )
        if existing_phase:
          raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Phase code '{code}' already exists in this competition",
          )
        order_index = phase_in.order_index if phase_in.order_index is not None else phase_ord
        phase = Phase(
          competition_id=competition.id,
          code=code,
          name=phase_in.name,
          order_index=order_index,
          event_modes=phase_in.event_modes,
        )
        db.add(phase)
        db.flush()
        created_phases += 1

        for ev_ord, ev_in in enumerate(phase_in.events):
          ev_code = ev_in.code or str(int(datetime.now(timezone.utc).timestamp() * 1000) + ev_ord)
          order_ev = ev_in.order_index if ev_in.order_index is not None else ev_ord
          event = Event(
            phase_id=phase.id,
            code=ev_code,
            name=ev_in.name,
            description=ev_in.description,
            order_index=order_ev,
            event_type=ev_in.event_type,
            gender_category=ev_in.gender_category,
          )
          db.add(event)
          db.flush()
          created_events += 1

      audit_log(
        db,
        current_user.id,
        "competition.import",
        "competition",
        competition.id,
        details=f"phases={len(comp_in.phases)}, events={sum(len(p.events) for p in comp_in.phases)}",
      )
    db.commit()
  except HTTPException:
    db.rollback()
    raise
  except Exception as e:
    db.rollback()
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=str(e),
    ) from e

  return {
    "created_competitions": created_competitions,
    "created_phases": created_phases,
    "created_events": created_events,
  }
