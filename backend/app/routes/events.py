from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..audit import audit_log
from ..auth.deps import get_current_admin, get_current_admin_or_viewer
from ..auth.ownership import require_phase_owner
from ..database import get_db
from ..models import AthleteHistory, Event, EventType, Gender, Level, Phase, PhaseEventModes, Score, User
from ..services.leaderboard import get_leaderboard
from ..schemas.competitions import EventCreate, EventRead, EventUpdate, PhaseRead

router = APIRouter(prefix="/phases", tags=["phases"])


def _ordinal(n: int) -> str:
  """Format integer as ordinal: 1 -> '1st', 2 -> '2nd', 21 -> '21st'."""
  if 10 <= n % 100 <= 20:
    suffix = "th"
  else:
    suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
  return f"{n}{suffix}"


def _create_phase_champion_history(
  db: Session,
  *,
  competition_id: int,
  phase_id: int,
) -> None:
  """Create phase-level champion history entries per (level, gender) when a phase is complete."""
  # Avoid duplicates: if we already have any podium entries for this phase, do nothing.
  existing = (
    db.query(AthleteHistory)
    .filter(
      AthleteHistory.competition_id == competition_id,
      AthleteHistory.phase_id == phase_id,
      AthleteHistory.podium_rank.is_not(None),
    )
    .first()
  )
  if existing:
    return

  phase = db.get(Phase, phase_id)
  if phase is None:
    return

  # Iterate all level/gender combinations. get_leaderboard will return [] when not applicable.
  levels = list(Level)
  genders = list(Gender)

  for level in levels:
    for gender in genders:
      entries = get_leaderboard(
        db,
        competition_id=competition_id,
        phase_id=phase_id,
        level=level,
        gender=gender,
        event_id=None,
      )
      if not entries:
        continue

      # Top 3 only
      for podium_index, lb_entry in enumerate(entries[:3], start=1):
        podium_rank = lb_entry.rank
        if podium_rank > 3:
          break

        # Build readable description including phase, level, and gender.
        level_label = level.value.replace("_", " ").title()
        gender_label = gender.value.title()
        if podium_rank == 1:
          text = f'Champions of the {phase.name} – {level_label} / {gender_label}'
        else:
          text = f'{_ordinal(podium_rank)} place overall in {phase.name} – {level_label} / {gender_label}'

        if lb_entry.athlete_pair is not None and lb_entry.athlete is None:
          # Doubles: both athletes get the same entry.
          for athlete_ref in (lb_entry.athlete_pair.athlete1, lb_entry.athlete_pair.athlete2):
            db.add(
              AthleteHistory(
                athlete_id=athlete_ref.id,
                competition_id=competition_id,
                phase_id=phase_id,
                event_id=None,
                entry=text,
                podium_rank=podium_rank,
                level=level,
              )
            )
        elif lb_entry.athlete is not None:
          db.add(
            AthleteHistory(
              athlete_id=lb_entry.athlete.id,
              competition_id=competition_id,
              phase_id=phase_id,
              event_id=None,
              entry=text,
              podium_rank=podium_rank,
              level=level,
            )
          )


@router.get("/{phase_id}", response_model=PhaseRead)
def get_phase(
  phase_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> Phase:
  return require_phase_owner(db, phase_id, current_user.id)


@router.get("/{phase_id}/events/{event_id}", response_model=EventRead)
def get_event(
  phase_id: int,
  event_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> Event:
  require_phase_owner(db, phase_id, current_user.id)
  event = db.get(Event, event_id)
  if event is None or event.phase_id != phase_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
  return event


@router.post("/{phase_id}/events", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def create_event(
  phase_id: int,
  payload: EventCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Event:
  phase = require_phase_owner(db, phase_id, current_user.id)
  code = payload.code if payload.code else str(int(datetime.now(timezone.utc).timestamp() * 1000))
  existing = (
    db.query(Event).filter(Event.phase_id == phase_id, Event.code == code).first()
  )
  if existing:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="An event with this code already exists in this phase",
    )
  if phase.event_modes == PhaseEventModes.SINGLES_ONLY and payload.event_type == EventType.DOUBLES:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Phase allows singles only; cannot create doubles event",
    )
  if phase.event_modes == PhaseEventModes.DOUBLES_ONLY and payload.event_type == EventType.SINGLES:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Phase allows doubles only; cannot create singles event",
    )
  if payload.order_index is not None:
    order_index = payload.order_index
  else:
    max_order = (
      db.query(func.max(Event.order_index)).filter(Event.phase_id == phase_id).scalar()
    )
    order_index = (max_order + 1) if max_order is not None else 0
  event = Event(
    phase_id=phase_id,
    code=code,
    name=payload.name,
    description=payload.description,
    order_index=order_index,
    event_type=payload.event_type,
    gender_category=payload.gender_category,
  )
  db.add(event)
  db.commit()
  db.refresh(event)
  audit_log(db, current_user.id, "event.create", "event", event.id)
  db.commit()
  return event


@router.get("/{phase_id}/events", response_model=list[EventRead])
def list_events(
  phase_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> list[Event]:
  require_phase_owner(db, phase_id, current_user.id)
  return list(
    db.query(Event).filter(Event.phase_id == phase_id).order_by(Event.order_index, Event.id).all()
  )


@router.patch("/{phase_id}/events/{event_id}", response_model=EventRead)
def update_event(
  phase_id: int,
  event_id: int,
  payload: EventUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Event:
  require_phase_owner(db, phase_id, current_user.id)
  event = db.get(Event, event_id)
  if event is None or event.phase_id != phase_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
  data = payload.model_dump(exclude_unset=True)
  if "code" in data and data["code"] != event.code:
    existing = (
      db.query(Event)
      .filter(Event.phase_id == phase_id, Event.code == data["code"])
      .first()
    )
    if existing:
      raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="An event with this code already exists in this phase",
      )
  for k, v in data.items():
    setattr(event, k, v)
  db.commit()
  db.refresh(event)
  audit_log(db, current_user.id, "event.update", "event", event_id)
  db.commit()
  return event


@router.post("/{phase_id}/events/{event_id}/finish", response_model=EventRead)
def finish_event(
  phase_id: int,
  event_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Event:
  require_phase_owner(db, phase_id, current_user.id)
  event = db.get(Event, event_id)
  if event is None or event.phase_id != phase_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
  if event.is_finished:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Event is already finished",
    )
  event.is_finished = True
  scores = (
    db.query(Score)
    .filter(Score.event_id == event_id)
    .all()
  )
  for score in scores:
    if score.rank_within_level is None:
      continue
    placement = f'{_ordinal(score.rank_within_level)} Place at the "{event.name}" Event'
    athlete_ids = [score.athlete_id]
    if score.partner_id is not None:
      athlete_ids.append(score.partner_id)
    for aid in athlete_ids:
      db.add(
        AthleteHistory(
          athlete_id=aid,
          competition_id=score.competition_id,
          phase_id=score.phase_id,
          event_id=event_id,
          entry=placement,
          level=score.level,
        )
      )
  db.commit()

  # If all events in this phase are now finished, create phase champion history entries.
  remaining_unfinished = (
    db.query(Event)
    .filter(Event.phase_id == phase_id, Event.is_finished.is_(False))
    .count()
  )
  if remaining_unfinished == 0 and event.phase_id is not None:
    phase = db.get(Phase, phase_id)
    if phase is not None:
      _create_phase_champion_history(
        db,
        competition_id=phase.competition_id,
        phase_id=phase_id,
      )
      db.commit()

  db.refresh(event)
  audit_log(db, current_user.id, "event.finish", "event", event_id)
  db.commit()
  return event


@router.delete("/{phase_id}/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
  phase_id: int,
  event_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> None:
  require_phase_owner(db, phase_id, current_user.id)
  event = db.get(Event, event_id)
  if event is None or event.phase_id != phase_id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
  if db.query(Score).filter(Score.event_id == event_id).first():
    raise HTTPException(
      status_code=status.HTTP_409_CONFLICT,
      detail="Cannot delete event with scores. Remove scores first.",
    )
  db.delete(event)
  audit_log(db, current_user.id, "event.delete", "event", event_id)
  db.commit()
