from collections import defaultdict
from datetime import date
from typing import List

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models import (
  Athlete,
  AthleteHistory,
  Competition,
  Event,
  EventType,
  Gender,
  GenderCategory,
  Level,
  Phase,
  Score,
)


def _validate_event_relationships(
  db: Session, competition_id: int, phase_id: int | None, event_id: int
) -> Event:
  event: Event | None = db.get(Event, event_id)
  if event is None:
    raise ValueError("Event not found")

  phase: Phase | None = db.get(Phase, event.phase_id)
  if phase is None or phase.competition_id != competition_id:
    raise ValueError("Event does not belong to the given competition")

  if phase_id is not None and phase.id != phase_id:
    raise ValueError("Event does not belong to the given phase")

  competition: Competition | None = db.get(Competition, competition_id)
  if competition is None:
    raise ValueError("Competition not found")

  return event


def _score_sort_key(score: Score) -> tuple:
  """Finishers (time) first, lower time better; then non-finishers, higher points better."""
  if score.time_seconds is not None:
    return (0, score.time_seconds)
  return (1, -(score.reps_points or 0))


def compute_ranking_for_level(level_scores: list[Score]) -> list[tuple[int, int, int]]:
  """
  Sort by: finishers (time ascending) first, then non-finishers (reps_points descending).
  Return list of (score_id, rank, points).
  """
  sorted_scores = sorted(level_scores, key=_score_sort_key)
  results: list[tuple[int, int, int]] = []
  rank = 0
  i = 0
  while i < len(sorted_scores):
    s0 = sorted_scores[i]
    group = [s0]
    j = i + 1
    while j < len(sorted_scores):
      sj = sorted_scores[j]
      if s0.time_seconds is not None and sj.time_seconds is not None:
        if sj.time_seconds != s0.time_seconds:
          break
      elif s0.reps_points is not None and sj.reps_points is not None:
        if sj.reps_points != s0.reps_points:
          break
      else:
        break
      group.append(sj)
      j += 1
    rank += 1 if rank == 0 else len(group)
    points = max(0, 100 - 3 * (rank - 1))
    for s in group:
      results.append((s.id, rank, points))
    i = j
  return results


def recalculate_event_ranking(db: Session, competition_id: int, event_id: int) -> None:
  stmt = select(Score).where(
    Score.competition_id == competition_id,
    Score.event_id == event_id,
  )
  scores: list[Score] = list(db.scalars(stmt))

  by_level: dict[Level, list[Score]] = defaultdict(list)
  for score in scores:
    if score.time_seconds is not None or score.reps_points is not None:
      by_level[score.level].append(score)

  for level, level_scores in by_level.items():
    ranking = compute_ranking_for_level(level_scores)
    for score_id, rank, points in ranking:
      score = next(s for s in scores if s.id == score_id)
      score.rank_within_level = rank
      score.points_awarded = points

  db.commit()


def _validate_gender_for_event(athlete: Athlete, event: Event) -> None:
  if event.gender_category == GenderCategory.MIXED:
    return
  if event.gender_category == GenderCategory.MALE and athlete.gender != Gender.MALE:
    raise ValueError("Event is male-only; athlete gender does not match")
  if event.gender_category == GenderCategory.FEMALE and athlete.gender != Gender.FEMALE:
    raise ValueError("Event is female-only; athlete gender does not match")


def _ensure_no_duplicate_score_for_event(
  db: Session,
  *,
  event: Event,
  level: Level,
  athlete_id: int,
  partner_id: int | None,
) -> None:
  """
  Ensure there is no existing score for this athlete (and partner, for doubles)
  in the given event and level.
  """
  # Singles: one score per athlete per event+level.
  if event.event_type == EventType.SINGLES:
    existing = db.scalar(
      select(Score.id).where(
        Score.event_id == event.id,
        Score.level == level,
        Score.athlete_id == athlete_id,
        Score.partner_id.is_(None),
      )
    )
    if existing is not None:
      raise ValueError("Athlete already has a score for this event and level")

    return

  # Doubles
  if partner_id is None:
    # Should not happen due to earlier validation, but guard defensively.
    raise ValueError("Doubles event requires a partner")

  # 1) Prevent duplicate pair (regardless of order, since we normalize ids).
  existing_pair = db.scalar(
    select(Score.id).where(
      Score.event_id == event.id,
      Score.level == level,
      Score.athlete_id == athlete_id,
      Score.partner_id == partner_id,
    )
  )
  if existing_pair is not None:
    raise ValueError("This pair already has a score for this event and level")

  # 2) Prevent either athlete from appearing in any other doubles score
  # for this event and level.
  existing_any = db.scalar(
    select(Score.id).where(
      Score.event_id == event.id,
      Score.level == level,
      or_(
        Score.athlete_id.in_([athlete_id, partner_id]),
        Score.partner_id.in_([athlete_id, partner_id]),
      ),
    )
  )
  if existing_any is not None:
    raise ValueError(
      "An athlete in this pair already has a doubles score for this event and level",
    )


def create_score_for_existing_athlete(
  db: Session,
  *,
  competition_id: int,
  phase_id: int | None,
  event_id: int,
  athlete_id: int,
  partner_id: int | None = None,
  partner: "AthleteForScoreCreate | None" = None,
  level: Level,
  time_seconds: float | None = None,
  reps_points: float | None = None,
) -> Score:
  from ..schemas.scores import AthleteForScoreCreate

  event = _validate_event_relationships(db, competition_id, phase_id, event_id)

  if event.event_type == EventType.DOUBLES and partner_id is None and partner is None:
    raise ValueError("Doubles event requires partner_id or partner")
  if event.event_type == EventType.SINGLES and (partner_id is not None or partner is not None):
    raise ValueError("Singles event must not have partner")

  competition = db.get(Competition, competition_id)
  if competition is None:
    raise ValueError("Competition not found")
  owner_id = competition.user_id

  athlete: Athlete | None = db.get(Athlete, athlete_id)
  if athlete is None or athlete.user_id != owner_id:
    raise ValueError("Athlete not found")
  _validate_gender_for_event(athlete, event)

  partner_athlete: Athlete | None = None
  if partner_id is not None:
    if partner is not None:
      raise ValueError("Provide either partner_id or partner, not both")
    partner_athlete = db.get(Athlete, partner_id)
    if partner_athlete is None or partner_athlete.user_id != owner_id:
      raise ValueError("Partner not found")
    _validate_gender_for_event(partner_athlete, event)
    if athlete_id == partner_id:
      raise ValueError("Athlete and partner cannot be the same")
  elif partner is not None:
    partner_athlete = Athlete(
      user_id=owner_id,
      name=partner.name,
      gender=partner.gender,
      level=partner.level,
      doubles_level=partner.doubles_level,
      birth_date=partner.birth_date,
    )
    db.add(partner_athlete)
    db.flush()
    _validate_gender_for_event(partner_athlete, event)

  aid, pid = athlete.id, partner_athlete.id if partner_athlete else None
  if pid is not None and aid > pid:
    aid, pid = pid, aid

  _ensure_no_duplicate_score_for_event(
    db,
    event=event,
    level=level,
    athlete_id=aid,
    partner_id=pid,
  )

  score = Score(
    athlete_id=aid,
    partner_id=pid if event.event_type == EventType.DOUBLES else None,
    competition_id=competition_id,
    phase_id=event.phase_id,
    event_id=event.id,
    level=level,
    time_seconds=time_seconds,
    reps_points=reps_points,
  )
  db.add(score)
  db.commit()
  db.refresh(score)

  recalculate_event_ranking(db, competition_id=competition_id, event_id=event_id)

  db.refresh(score)
  return score


def create_score_with_new_athlete(
  db: Session,
  *,
  competition_id: int,
  phase_id: int | None,
  event_id: int,
  name: str,
  gender: Gender,
  level: Level,
  doubles_level: Level,
  birth_date: date | None,
  history_entries: list[str] | None,
  time_seconds: float | None = None,
  reps_points: float | None = None,
  partner_id: int | None = None,
  partner: "AthleteForScoreCreate | None" = None,
) -> Score:
  from ..schemas.scores import AthleteForScoreCreate

  event = _validate_event_relationships(db, competition_id, phase_id, event_id)

  if event.event_type == EventType.DOUBLES:
    has_partner = partner_id is not None or partner is not None
    if not has_partner:
      raise ValueError("Doubles event requires partner_id or partner")
  else:
    if partner_id is not None or partner is not None:
      raise ValueError("Singles event must not have partner")

  competition = db.get(Competition, competition_id)
  if competition is None:
    raise ValueError("Competition not found")
  owner_id = competition.user_id

  athlete = Athlete(
    user_id=owner_id,
    name=name,
    gender=gender,
    level=level,
    doubles_level=doubles_level,
    birth_date=birth_date,
  )
  db.add(athlete)
  db.flush()

  partner_athlete: Athlete | None = None
  if partner_id is not None:
    partner_athlete = db.get(Athlete, partner_id)
    if partner_athlete is None or partner_athlete.user_id != owner_id:
      raise ValueError("Partner not found")
    _validate_gender_for_event(partner_athlete, event)
  elif partner is not None:
    partner_athlete = Athlete(
      user_id=owner_id,
      name=partner.name,
      gender=partner.gender,
      level=partner.level,
      doubles_level=partner.doubles_level,
      birth_date=partner.birth_date,
    )
    db.add(partner_athlete)
    db.flush()
    _validate_gender_for_event(partner_athlete, event)

  aid, pid = athlete.id, partner_athlete.id if partner_athlete else None
  if pid is not None and aid > pid:
    aid, pid = pid, aid

  _ensure_no_duplicate_score_for_event(
    db,
    event=event,
    level=level,
    athlete_id=aid,
    partner_id=pid,
  )

  if history_entries:
    for entry in history_entries:
      if entry.strip():
        db.add(
          AthleteHistory(
            athlete_id=athlete.id,
            competition_id=competition_id,
            phase_id=event.phase_id,
            event_id=event.id,
            entry=entry.strip(),
          )
        )

  score = Score(
    athlete_id=aid,
    partner_id=pid if event.event_type == EventType.DOUBLES else None,
    competition_id=competition_id,
    phase_id=event.phase_id,
    event_id=event.id,
    level=level,
    time_seconds=time_seconds,
    reps_points=reps_points,
  )
  db.add(score)
  db.commit()
  db.refresh(score)

  recalculate_event_ranking(db, competition_id=competition_id, event_id=event_id)

  db.refresh(score)
  return score

