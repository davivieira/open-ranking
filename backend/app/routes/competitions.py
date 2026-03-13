import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import audit_log
from ..auth.deps import get_current_admin, get_current_admin_or_viewer
from ..auth.ownership import require_competition_owner
from ..database import get_db
from ..models import AthleteHistory, Competition, Event, Phase, Score, User
from ..schemas.competitions import (
  CompetitionCreate,
  CompetitionRead,
  CompetitionUpdate,
  EventRead,
  PhaseCreate,
  PhaseRead,
  PhaseUpdate,
)

router = APIRouter(prefix="/competitions", tags=["competitions"])


def _get_competition_by_public_slug(db: Session, public_slug: str) -> Competition:
  competition = db.query(Competition).filter(Competition.public_slug == public_slug).first()
  if competition is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Competition not found")
  return competition


@router.post("", response_model=CompetitionRead, status_code=status.HTTP_201_CREATED)
def create_competition(
  payload: CompetitionCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Competition:
  existing = (
    db.query(Competition)
    .filter(Competition.user_id == current_user.id, Competition.slug == payload.slug)
    .first()
  )
  if existing:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="A competition with this slug already exists",
    )
  for _ in range(10):
    short_id = secrets.token_urlsafe(6).replace("-", "").replace("_", "")[:8]
    public_slug = f"{payload.slug}-{short_id}"
    if db.query(Competition).filter(Competition.public_slug == public_slug).first() is None:
      break
  else:
    public_slug = f"{payload.slug}-{secrets.token_hex(4)}"
  competition = Competition(
    user_id=current_user.id,
    name=payload.name,
    slug=payload.slug,
    public_slug=public_slug,
    type=payload.type,
    year=payload.year,
    description=payload.description,
    is_active=payload.is_active,
  )
  db.add(competition)
  db.commit()
  db.refresh(competition)
  audit_log(db, current_user.id, "competition.create", "competition", competition.id)
  db.commit()
  return competition


@router.get("", response_model=list[CompetitionRead])
def list_competitions(
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> list[Competition]:
  return list(
    db.query(Competition)
    .filter(Competition.user_id == current_user.id)
    .order_by(Competition.id)
    .all()
  )


@router.get("/public/{public_slug}", response_model=CompetitionRead)
def get_competition_by_public_slug(
  public_slug: str,
  db: Session = Depends(get_db),
) -> Competition:
  return _get_competition_by_public_slug(db, public_slug)


@router.get("/public/{public_slug}/phases", response_model=list[PhaseRead])
def list_phases_public(
  public_slug: str,
  db: Session = Depends(get_db),
) -> list[Phase]:
  competition = _get_competition_by_public_slug(db, public_slug)
  return list(
    db.query(Phase)
    .filter(Phase.competition_id == competition.id)
    .order_by(Phase.order_index, Phase.id)
    .all()
  )


@router.get("/public/{public_slug}/phases/{phase_id}/events", response_model=list[EventRead])
def list_events_public(
  public_slug: str,
  phase_id: int,
  db: Session = Depends(get_db),
) -> list[Event]:
  competition = _get_competition_by_public_slug(db, public_slug)
  phase = db.get(Phase, phase_id)
  if phase is None or phase.competition_id != competition.id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
  return list(
    db.query(Event).filter(Event.phase_id == phase_id).order_by(Event.order_index, Event.id).all()
  )


@router.get("/{competition_id}", response_model=CompetitionRead)
def get_competition(
  competition_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> Competition:
  return require_competition_owner(db, competition_id, current_user.id)


@router.patch("/{competition_id}", response_model=CompetitionRead)
def update_competition(
  competition_id: int,
  payload: CompetitionUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Competition:
  competition = require_competition_owner(db, competition_id, current_user.id)
  data = payload.model_dump(exclude_unset=True)
  if "slug" in data and data["slug"] != competition.slug:
    existing = (
      db.query(Competition)
      .filter(Competition.user_id == current_user.id, Competition.slug == data["slug"])
      .first()
    )
    if existing:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="A competition with this slug already exists",
      )
  for k, v in data.items():
    setattr(competition, k, v)
  db.commit()
  db.refresh(competition)
  audit_log(db, current_user.id, "competition.update", "competition", competition_id)
  db.commit()
  return competition


@router.delete("/{competition_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_competition(
  competition_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> None:
  competition = require_competition_owner(db, competition_id, current_user.id)
  phase_ids = [p.id for p in db.query(Phase).filter(Phase.competition_id == competition_id).all()]
  db.query(Score).filter(Score.competition_id == competition_id).delete(synchronize_session=False)
  db.query(AthleteHistory).filter(AthleteHistory.competition_id == competition_id).delete(synchronize_session=False)
  if phase_ids:
    db.query(Event).filter(Event.phase_id.in_(phase_ids)).delete(synchronize_session=False)
  db.query(Phase).filter(Phase.competition_id == competition_id).delete(synchronize_session=False)
  db.delete(competition)
  audit_log(db, current_user.id, "competition.delete", "competition", competition_id)
  db.commit()


@router.post("/{competition_id}/phases", response_model=PhaseRead, status_code=status.HTTP_201_CREATED)
def create_phase(
  competition_id: int,
  payload: PhaseCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Phase:
  require_competition_owner(db, competition_id, current_user.id)
  code = payload.code if payload.code else str(int(datetime.now(timezone.utc).timestamp() * 1000))
  existing = (
    db.query(Phase)
    .filter(Phase.competition_id == competition_id, Phase.code == code)
    .first()
  )
  if existing:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="A phase with this code already exists in this competition",
    )
  if payload.order_index is not None:
    order_index = payload.order_index
  else:
    max_order = (
      db.query(func.max(Phase.order_index))
      .filter(Phase.competition_id == competition_id)
      .scalar()
    )
    order_index = (max_order + 1) if max_order is not None else 0
  phase = Phase(
    competition_id=competition_id,
    code=code,
    name=payload.name,
    order_index=order_index,
    event_modes=payload.event_modes,
  )
  db.add(phase)
  db.commit()
  db.refresh(phase)
  audit_log(db, current_user.id, "phase.create", "phase", phase.id)
  db.commit()
  return phase


@router.get("/{competition_id}/phases", response_model=list[PhaseRead])
def list_phases(
  competition_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> list[Phase]:
  require_competition_owner(db, competition_id, current_user.id)
  return list(
    db.query(Phase).filter(Phase.competition_id == competition_id).order_by(Phase.order_index, Phase.id).all()
  )


@router.patch("/{competition_id}/phases/{phase_id}", response_model=PhaseRead)
def update_phase(
  competition_id: int,
  phase_id: int,
  payload: PhaseUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Phase:
  require_competition_owner(db, competition_id, current_user.id)
  phase = db.get(Phase, phase_id)
  if phase is None or phase.competition_id != competition_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
  data = payload.model_dump(exclude_unset=True)
  if "code" in data and data["code"] != phase.code:
    existing = (
      db.query(Phase)
      .filter(Phase.competition_id == competition_id, Phase.code == data["code"])
      .first()
    )
    if existing:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="A phase with this code already exists in this competition",
      )
  for k, v in data.items():
    setattr(phase, k, v)
  db.commit()
  db.refresh(phase)
  audit_log(db, current_user.id, "phase.update", "phase", phase_id)
  db.commit()
  return phase


@router.delete("/{competition_id}/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_phase(
  competition_id: int,
  phase_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> None:
  require_competition_owner(db, competition_id, current_user.id)
  phase = db.get(Phase, phase_id)
  if phase is None or phase.competition_id != competition_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Phase not found")
  event_ids = [e.id for e in db.query(Event).filter(Event.phase_id == phase_id).all()]
  db.query(Score).filter(Score.phase_id == phase_id).delete(synchronize_session=False)
  if event_ids:
    db.query(Score).filter(Score.event_id.in_(event_ids)).delete(synchronize_session=False)
  db.query(AthleteHistory).filter(AthleteHistory.phase_id == phase_id).delete(synchronize_session=False)
  if event_ids:
    db.query(AthleteHistory).filter(AthleteHistory.event_id.in_(event_ids)).delete(synchronize_session=False)
  db.query(Event).filter(Event.phase_id == phase_id).delete(synchronize_session=False)
  db.delete(phase)
  audit_log(db, current_user.id, "phase.delete", "phase", phase_id)
  db.commit()
