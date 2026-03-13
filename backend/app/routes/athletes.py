from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from ..audit import audit_log
from ..auth.deps import get_current_admin, get_current_admin_or_viewer
from ..database import get_db
from ..models import Athlete, AthleteHistory, Gender, Level, Score, User
from ..schemas.athletes import AthleteCreate, AthleteHistoryRead, AthleteProfile, AthleteUpdate

router = APIRouter(prefix="/athletes", tags=["athletes"])


def _age_from_birth_date(birth_date: date | None) -> int | None:
  if birth_date is None:
    return None
  today = date.today()
  return (today - birth_date).days // 365


def _events_count(db: Session, athlete_id: int) -> int:
  return (
    db.query(func.count(Score.id))
    .filter(or_(Score.athlete_id == athlete_id, Score.partner_id == athlete_id))
    .scalar()
    or 0
  )


def _athlete_to_profile(db: Session, athlete: Athlete) -> AthleteProfile:
  return AthleteProfile(
    id=athlete.id,
    name=athlete.name,
    gender=athlete.gender,
    level=athlete.level,
    doubles_level=athlete.doubles_level,
    birth_date=athlete.birth_date,
    age=_age_from_birth_date(athlete.birth_date),
    events_participated=_events_count(db, athlete.id),
  )


@router.get("", response_model=list[AthleteProfile])
def list_athletes(
  gender: Gender | None = Query(default=None, description="Filter by gender"),
  level: Level | None = Query(default=None, description="Filter by level (singles or doubles)"),
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> list[AthleteProfile]:
  q = (
    db.query(Athlete)
    .filter(Athlete.user_id == current_user.id)
    .order_by(Athlete.name, Athlete.id)
  )
  if gender is not None:
    q = q.filter(Athlete.gender == gender)
  if level is not None:
    singles_levels = {Level.RX, Level.SCALED, Level.BEGINNER}
    doubles_levels = {Level.DOUBLE_RX, Level.DOUBLE_SCALED, Level.DOUBLE_BEGINNER}
    if level in singles_levels:
      q = q.filter(Athlete.level == level)
    else:
      q = q.filter(Athlete.doubles_level == level)
  athletes = list(q.all())
  return [_athlete_to_profile(db, a) for a in athletes]


@router.post("", response_model=AthleteProfile, status_code=status.HTTP_201_CREATED)
def create_athlete(
  payload: AthleteCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> AthleteProfile:
  athlete = Athlete(
    user_id=current_user.id,
    name=payload.name,
    gender=payload.gender,
    level=payload.level,
    doubles_level=payload.doubles_level,
    birth_date=payload.birth_date,
  )
  db.add(athlete)
  db.commit()
  db.refresh(athlete)
  audit_log(db, current_user.id, "athlete.create", "athlete", athlete.id)
  db.commit()
  return _athlete_to_profile(db, athlete)


@router.get("/{athlete_id}", response_model=AthleteProfile)
def get_athlete(
  athlete_id: int,
  db: Session = Depends(get_db),
) -> AthleteProfile:
  """Public: anyone can view an athlete profile (e.g. from leaderboard links)."""
  athlete = db.get(Athlete, athlete_id)
  if athlete is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
  return _athlete_to_profile(db, athlete)


@router.get("/{athlete_id}/history", response_model=list[AthleteHistoryRead])
def get_athlete_history(
  athlete_id: int,
  db: Session = Depends(get_db),
) -> list[AthleteHistoryRead]:
  """Public: anyone can view an athlete's history (e.g. from leaderboard links)."""
  athlete = db.get(Athlete, athlete_id)
  if athlete is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
  entries = (
    db.query(AthleteHistory)
    .options(
      joinedload(AthleteHistory.competition),
      joinedload(AthleteHistory.phase),
      joinedload(AthleteHistory.event),
    )
    .filter(AthleteHistory.athlete_id == athlete_id)
    .order_by(AthleteHistory.id.desc())
    .all()
  )

  def _format_result(score: Score) -> str | None:
    if score.time_seconds is not None:
      total = score.time_seconds
      if total < 0:
        return None
      hours = int(total // 3600)
      minutes = int((total % 3600) // 60)
      seconds = int(total % 60)
      ms = total - int(total)
      if hours > 0:
        base = f"{hours}:{minutes:02d}:{seconds:02d}"
      else:
        base = f"{minutes}:{seconds:02d}"
      if ms > 0:
        # One decimal place is enough for display.
        base += f".{int(round(ms * 10))}"
      return base
    if score.reps_points is not None:
      return str(score.reps_points)
    return None

  # Cache winners per (event_id, level) to avoid repeated queries.
  winner_cache: dict[tuple[int, Level], tuple[str | None, str | None]] = {}

  def _winner_for(event_id: int, level: Level) -> tuple[str | None, str | None]:
    key = (event_id, level)
    if key in winner_cache:
      return winner_cache[key]
    winner = (
      db.query(Score)
      .options(
        joinedload(Score.athlete),
        joinedload(Score.partner),
      )
      .filter(
        Score.event_id == event_id,
        Score.level == level,
        Score.rank_within_level == 1,
      )
      .first()
    )
    if winner is None:
      winner_cache[key] = (None, None)
      return winner_cache[key]
    if winner.partner is not None:
      name = f"{winner.athlete.name} / {winner.partner.name}"
    else:
      name = winner.athlete.name
    result = _format_result(winner)
    winner_cache[key] = (name, result)
    return winner_cache[key]

  # Cache current athlete's result per (event_id, level, athlete_id) to avoid repeated queries.
  athlete_result_cache: dict[tuple[int, Level, int], str | None] = {}

  def _athlete_result_for(event_id: int, level: Level, athlete_id: int) -> str | None:
    key = (event_id, level, athlete_id)
    if key in athlete_result_cache:
      return athlete_result_cache[key]
    score = (
      db.query(Score)
      .filter(
        Score.event_id == event_id,
        Score.level == level,
        (Score.athlete_id == athlete_id) | (Score.partner_id == athlete_id),
      )
      .first()
    )
    if score is None:
      athlete_result_cache[key] = None
      return None
    athlete_result_cache[key] = _format_result(score)
    return athlete_result_cache[key]

  result: list[AthleteHistoryRead] = []
  for e in entries:
    winner_name: str | None = None
    winner_result: str | None = None
    athlete_result: str | None = None
    if e.event_id is not None and e.level is not None:
      w_name, w_result = _winner_for(e.event_id, e.level)
      winner_name, winner_result = w_name, w_result
      athlete_result = _athlete_result_for(e.event_id, e.level, athlete_id)

    result.append(
      AthleteHistoryRead(
        id=e.id,
        athlete_id=e.athlete_id,
        competition_id=e.competition_id,
        phase_id=e.phase_id,
        event_id=e.event_id,
        entry=e.entry,
        competition_public_slug=e.competition.public_slug if e.competition else None,
        competition_year=e.competition.year if e.competition else None,
        phase_name=e.phase.name if e.phase else None,
        podium_rank=e.podium_rank,
        level=e.level,
        event_name=e.event.name if e.event else None,
        event_description=e.event.description if e.event else None,
        winner_name=winner_name,
        winner_result=winner_result,
        athlete_result=athlete_result,
      )
    )
  return result


@router.patch("/{athlete_id}", response_model=AthleteProfile)
def update_athlete(
  athlete_id: int,
  payload: AthleteUpdate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> AthleteProfile:
  athlete = db.get(Athlete, athlete_id)
  if athlete is None or athlete.user_id != current_user.id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
  data = payload.model_dump(exclude_unset=True)
  for k, v in data.items():
    setattr(athlete, k, v)
  db.commit()
  db.refresh(athlete)
  audit_log(db, current_user.id, "athlete.update", "athlete", athlete_id)
  db.commit()
  return _athlete_to_profile(db, athlete)


@router.delete("/{athlete_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_athlete(
  athlete_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> None:
  athlete = db.get(Athlete, athlete_id)
  if athlete is None or athlete.user_id != current_user.id:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
  # Check if athlete has scores
  count = _events_count(db, athlete_id)
  if count > 0:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail=f"Cannot delete athlete with {count} event(s) participated. Remove scores first.",
    )
  db.delete(athlete)
  audit_log(db, current_user.id, "athlete.delete", "athlete", athlete_id)
  db.commit()
