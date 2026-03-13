from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import case, select
from sqlalchemy.orm import Session, joinedload

from ..audit import audit_log
from ..auth.deps import get_current_admin, get_current_admin_or_viewer
from ..auth.ownership import require_event_owner
from ..database import get_db
from ..models import Athlete, Event, EventType, Level, Score, User
from ..schemas.scores import (
  AthleteForScoreCreate,
  ScoreCreateExistingAthlete,
  ScoreCreateWithNewAthlete,
  ScoreRead,
)
from ..services.scoring import (
  create_score_for_existing_athlete,
  create_score_with_new_athlete,
  recalculate_event_ranking,
)


router = APIRouter(prefix="/scores", tags=["scores"])


class ScoreCreate(BaseModel):
  competition_id: int
  phase_id: int | None = None
  event_id: int
  time_seconds: float | None = None
  reps_points: float | None = None
  level: Level | None = None  # derived from athlete when not provided
  athlete_id: int | None = None
  athlete: AthleteForScoreCreate | None = None
  partner_id: int | None = None
  partner: AthleteForScoreCreate | None = None


@router.post("", response_model=ScoreRead, status_code=status.HTTP_201_CREATED)
def create_score(
  payload: ScoreCreate,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> Score:
  event = require_event_owner(db, payload.event_id, current_user.id)
  if event.is_finished:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Event is finished; no more scores can be added",
    )

  if payload.partner_id is not None and payload.partner is not None:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Provide either partner_id or partner, not both",
    )

  has_athlete = payload.athlete_id is not None or payload.athlete is not None
  if not has_athlete:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Either athlete_id or athlete payload must be provided",
    )
  if (payload.time_seconds is None) == (payload.reps_points is None):
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Provide exactly one of time_seconds (athlete finished) or reps_points (time cap)",
    )

  # Derive level from athlete when not provided
  level = payload.level
  if level is None:
    if event.event_type == EventType.SINGLES:
      if payload.athlete_id is not None:
        athlete = db.get(Athlete, payload.athlete_id)
        if athlete is None:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
        level = athlete.level
      else:
        level = payload.athlete.level
    else:
      # Doubles: use primary athlete's doubles_level
      if payload.athlete_id is not None:
        athlete = db.get(Athlete, payload.athlete_id)
        if athlete is None:
          raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Athlete not found")
        level = athlete.doubles_level
      else:
        level = payload.athlete.doubles_level

  try:
    if payload.athlete_id is not None:
      score = create_score_for_existing_athlete(
        db,
        competition_id=payload.competition_id,
        phase_id=payload.phase_id,
        event_id=payload.event_id,
        athlete_id=payload.athlete_id,
        partner_id=payload.partner_id,
        partner=payload.partner,
        level=level,
        time_seconds=payload.time_seconds,
        reps_points=payload.reps_points,
      )
    else:
      score = create_score_with_new_athlete(
        db,
        competition_id=payload.competition_id,
        phase_id=payload.phase_id,
        event_id=payload.event_id,
        name=payload.athlete.name,
        gender=payload.athlete.gender,
        level=level,
        doubles_level=payload.athlete.doubles_level,
        birth_date=payload.athlete.birth_date,
        history_entries=payload.athlete.history_entries or [],
        time_seconds=payload.time_seconds,
        reps_points=payload.reps_points,
        partner_id=payload.partner_id,
        partner=payload.partner,
      )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

  audit_log(db, current_user.id, "score.create", "score", score.id)
  db.commit()
  return score


@router.get("/events/{event_id}", response_model=list[ScoreRead])
def list_event_scores(
  event_id: int,
  level: Level | None = Query(default=None),
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin_or_viewer),
) -> list[Score]:
  require_event_owner(db, event_id, current_user.id)
  stmt = (
    select(Score)
    .where(Score.event_id == event_id)
    .options(joinedload(Score.athlete), joinedload(Score.partner))
  )
  if level is not None:
    stmt = stmt.where(Score.level == level)

  stmt = stmt.order_by(
    Score.rank_within_level.asc().nullslast(),
    case((Score.time_seconds.isnot(None), 0), else_=1),
    Score.time_seconds.asc().nullslast(),
    Score.reps_points.desc().nullslast(),
  )
  scores = list(db.scalars(stmt))
  return scores


@router.delete("/{score_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_score(
  score_id: int,
  db: Session = Depends(get_db),
  current_user: User = Depends(get_current_admin),
) -> None:
  score = db.get(Score, score_id)
  if score is None:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Score not found")
  require_event_owner(db, score.event_id, current_user.id)
  competition_id = score.competition_id
  event_id = score.event_id
  db.delete(score)
  audit_log(db, current_user.id, "score.delete", "score", score_id)
  db.commit()
  recalculate_event_ranking(db, competition_id=competition_id, event_id=event_id)

