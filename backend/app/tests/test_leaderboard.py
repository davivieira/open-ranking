from sqlalchemy.orm import Session

from app.models import (
  Athlete,
  Competition,
  CompetitionType,
  Event,
  EventType,
  Gender,
  GenderCategory,
  Level,
  Phase,
  Score,
  User,
  UserRole,
)
from app.services.leaderboard import get_leaderboard


def _seed_basic_competition(db: Session) -> tuple[Competition, Phase, Event, Event]:
  user = User(
    email="owner@example.com",
    password_hash="x",
    role=UserRole.ADMIN,
  )
  db.add(user)
  db.flush()

  comp = Competition(
    user_id=user.id,
    name="Open 2026",
    slug="open-2026",
    public_slug="open-2026",
    type=CompetitionType.OPEN,
    year=2026,
    description=None,
    is_active=True,
  )
  db.add(comp)
  db.flush()

  phase = Phase(
    competition_id=comp.id,
    code="23.1",
    name="Open",
    order_index=0,
  )
  db.add(phase)
  db.flush()

  ev1 = Event(
    phase_id=phase.id,
    code="E1",
    name="Event 1",
    description=None,
    order_index=0,
    event_type=EventType.SINGLES,
    gender_category=GenderCategory.MALE,
  )
  ev2 = Event(
    phase_id=phase.id,
    code="E2",
    name="Event 2",
    description=None,
    order_index=1,
    event_type=EventType.SINGLES,
    gender_category=GenderCategory.MALE,
  )
  db.add_all([ev1, ev2])
  db.flush()

  return comp, phase, ev1, ev2


def test_leaderboard_aggregates_points_by_athlete(db_session: Session):
  comp, phase, ev1, ev2 = _seed_basic_competition(db_session)

  a1 = Athlete(
    user_id=comp.user_id,
    name="Alice",
    gender=Gender.MALE,
    level=Level.RX,
    doubles_level=Level.DOUBLE_RX,
    birth_date=None,
  )
  a2 = Athlete(
    user_id=comp.user_id,
    name="Bob",
    gender=Gender.MALE,
    level=Level.RX,
    doubles_level=Level.DOUBLE_RX,
    birth_date=None,
  )
  db_session.add_all([a1, a2])
  db_session.flush()

  # Alice wins event 1 (100 pts), Bob second (97 pts).
  s1 = Score(
    athlete_id=a1.id,
    competition_id=comp.id,
    phase_id=phase.id,
    event_id=ev1.id,
    level=Level.RX,
    time_seconds=100.0,
    reps_points=None,
    partner_id=None,
    rank_within_level=1,
    points_awarded=100,
  )
  s2 = Score(
    athlete_id=a2.id,
    competition_id=comp.id,
    phase_id=phase.id,
    event_id=ev1.id,
    level=Level.RX,
    time_seconds=120.0,
    reps_points=None,
    partner_id=None,
    rank_within_level=2,
    points_awarded=97,
  )

  # Bob wins event 2 (100 pts), Alice second (97 pts).
  s3 = Score(
    athlete_id=a1.id,
    competition_id=comp.id,
    phase_id=phase.id,
    event_id=ev2.id,
    level=Level.RX,
    time_seconds=140.0,
    reps_points=None,
    partner_id=None,
    rank_within_level=2,
    points_awarded=97,
  )
  s4 = Score(
    athlete_id=a2.id,
    competition_id=comp.id,
    phase_id=phase.id,
    event_id=ev2.id,
    level=Level.RX,
    time_seconds=130.0,
    reps_points=None,
    partner_id=None,
    rank_within_level=1,
    points_awarded=100,
  )
  db_session.add_all([s1, s2, s3, s4])
  db_session.commit()

  entries = get_leaderboard(
    db_session,
    competition_id=comp.id,
    phase_id=phase.id,
    level=Level.RX,
    gender=Gender.MALE,
  )

  assert len(entries) == 2

  # Alice: 100 + 97 = 197; Bob: 97 + 100 = 197 -> tied on points, both rank 1.
  totals = {e.athlete.name: e.total_points for e in entries if e.athlete is not None}
  assert totals["Alice"] == 197
  assert totals["Bob"] == 197

  ranks = {e.athlete.name: e.rank for e in entries if e.athlete is not None}
  assert set(ranks.values()) == {1}

