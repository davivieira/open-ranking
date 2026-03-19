"""
Leaderboard aggregation service.
Ranking is defined by: competition, phase (stage), level, gender.
Optional event_id narrows to single-event qualification view.
"""
from typing import Union

from sqlalchemy.orm import Session, joinedload

from ..models import Event, EventType, Gender, GenderCategory, Level, Phase, Score
from ..schemas.leaderboard import AthletePairRef, AthleteRef, LeaderboardEntry


SINGLES_LEVELS = {Level.RX, Level.SCALED, Level.BEGINNER}
DOUBLES_LEVELS = {Level.DOUBLE_RX, Level.DOUBLE_SCALED, Level.DOUBLE_BEGINNER}


def _event_matches_gender(gender_category: GenderCategory, filter_gender: Gender) -> bool:
  if filter_gender == Gender.MALE:
    return gender_category in (GenderCategory.MALE, GenderCategory.MIXED)
  return gender_category in (GenderCategory.FEMALE, GenderCategory.MIXED)


def _format_score_result(score: Score) -> str | None:
  """Format score as display string: time M:SS or H:MM:SS, or reps/points as string."""
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
      base += f".{int(round(ms * 10))}"
    return base
  if score.reps_points is not None:
    return str(score.reps_points)
  return None


def get_leaderboard(
  db: Session,
  *,
  competition_id: int,
  phase_id: int,
  level: Level,
  gender: Gender,
  event_id: int | None = None,
) -> list[LeaderboardEntry]:
  """
  Returns leaderboard entries: rank, athlete or athlete_pair, total_points, event_count.
  """
  phase = db.get(Phase, phase_id)
  if phase is None or phase.competition_id != competition_id:
    return []

  is_doubles = level in DOUBLES_LEVELS

  stmt = (
    db.query(Score)
    .options(
      joinedload(Score.athlete),
      joinedload(Score.partner),
      joinedload(Score.event),
    )
    .where(
      Score.competition_id == competition_id,
      Score.phase_id == phase_id,
      Score.level == level,
    )
  )
  if event_id is not None:
    stmt = stmt.where(Score.event_id == event_id)
    event_obj = db.get(Event, event_id)
    if event_obj is None or event_obj.phase_id != phase_id:
      return []
    if not _event_matches_gender(event_obj.gender_category, gender):
      return []
    if is_doubles and event_obj.event_type != EventType.DOUBLES:
      return []
    if not is_doubles and event_obj.event_type != EventType.SINGLES:
      return []

  scores = list(db.scalars(stmt))

  allowed_event_ids: set[int] | None = None
  if event_id is None:
    events = db.query(Event).filter(Event.phase_id == phase_id).all()
    allowed_event_ids = {
      e.id for e in events
      if _event_matches_gender(e.gender_category, gender)
      and (e.event_type == EventType.DOUBLES if is_doubles else e.event_type == EventType.SINGLES)
    }

  # value: (total_pts, event_count, victories_count, best_single_event_rank, ref, event_result_str | None)
  _BIG = 999999
  totals: dict[tuple, tuple[float, int, int, int, Union[AthleteRef, AthletePairRef], str | None]] = {}

  for s in scores:
    pts = s.points_awarded or 0
    if pts == 0:
      continue

    ev = s.event
    if ev is None:
      continue
    if event_id is None and (allowed_event_ids is None or ev.id not in allowed_event_ids):
      continue

    victory = 1 if s.rank_within_level == 1 else 0
    best_rank = s.rank_within_level if s.rank_within_level is not None else _BIG

    if is_doubles:
      if s.partner_id is None or s.athlete is None or s.partner is None:
        continue
      a1, a2 = s.athlete, s.partner
      if a1.gender != gender or a2.gender != gender:
        continue
      aid, pid = s.athlete_id, s.partner_id
      key = (min(aid, pid), max(aid, pid))
      a_lo = a1 if aid < pid else a2
      a_hi = a2 if aid < pid else a1
      ref = AthletePairRef(
        athlete1=AthleteRef(id=a_lo.id, name=a_lo.name),
        athlete2=AthleteRef(id=a_hi.id, name=a_hi.name),
      )
    else:
      if s.athlete_id is None or s.athlete is None:
        continue
      a = s.athlete
      if a.gender != gender:
        continue
      key = (s.athlete_id,)
      ref = AthleteRef(id=a.id, name=a.name)

    event_result_str: str | None = _format_score_result(s) if event_id is not None else None

    if key in totals:
      prev_pts, prev_cnt, prev_wins, prev_best, _, prev_result = totals[key]
      totals[key] = (
        prev_pts + pts,
        prev_cnt + 1,
        prev_wins + victory,
        min(prev_best, best_rank),
        ref,
        prev_result if event_id is not None else None,
      )
    else:
      totals[key] = (pts, 1, victory, best_rank, ref, event_result_str)

  def _sort_key(item: tuple) -> tuple:
    key, (total_pts, ev_count, victories, best_rank, _, _) = item
    return (-total_pts, -victories, best_rank, key)

  sorted_items = sorted(totals.items(), key=_sort_key)

  result: list[LeaderboardEntry] = []
  prev_rank_key: tuple[float, int, int | None] | None = None
  rank = 1

  for i, (key, (total_pts, ev_count, victories, best_rank, ref, entry_result)) in enumerate(sorted_items):
    rank_key = (total_pts, victories, best_rank if victories == 0 else None)
    if rank_key != prev_rank_key:
      rank = i + 1
    prev_rank_key = rank_key

    if is_doubles:
      result.append(
        LeaderboardEntry(
          rank=rank,
          athlete_pair=ref,
          total_points=total_pts,
          event_count=ev_count,
          event_result=entry_result,
        )
      )
    else:
      result.append(
        LeaderboardEntry(
          rank=rank,
          athlete=ref,
          total_points=total_pts,
          event_count=ev_count,
          event_result=entry_result,
        )
      )

  return result
