from app.models import Score
from app.services.scoring import compute_ranking_for_level


def _make_score(score_id: int, time_seconds: float | None, reps_points: float | None) -> Score:
  s = Score(
    athlete_id=1,
    competition_id=1,
    phase_id=1,
    event_id=1,
    level="RX",  # type: ignore[arg-type]
  )
  s.id = score_id
  s.time_seconds = time_seconds
  s.reps_points = reps_points
  return s


def test_compute_ranking_for_level_time_then_points():
  # Two finishers with different times and one non-finisher with points.
  s1 = _make_score(1, time_seconds=60.0, reps_points=None)
  s2 = _make_score(2, time_seconds=90.0, reps_points=None)
  s3 = _make_score(3, time_seconds=None, reps_points=100.0)

  ranking = sorted(compute_ranking_for_level([s3, s2, s1]), key=lambda x: x[0])

  # Results are (score_id, rank, points)
  assert ranking[0][0] == 1
  assert ranking[1][0] == 2
  assert ranking[2][0] == 3

  # First rank gets 100 points, next unique rank gets 97, then 94, ...
  assert ranking[0][2] == 100
  assert ranking[1][2] == 97
  assert ranking[2][2] == 94


def test_compute_ranking_for_level_ties_share_rank_and_points():
  # Two athletes tie on time; both should share the same rank and points.
  s1 = _make_score(1, time_seconds=60.0, reps_points=None)
  s2 = _make_score(2, time_seconds=60.0, reps_points=None)
  s3 = _make_score(3, time_seconds=75.0, reps_points=None)

  ranking = sorted(compute_ranking_for_level([s3, s2, s1]), key=lambda x: x[0])

  id1, rank1, pts1 = ranking[0]
  id2, rank2, pts2 = ranking[1]
  id3, rank3, pts3 = ranking[2]

  assert {id1, id2} == {1, 2}
  assert rank1 == rank2
  assert pts1 == pts2 == 100

  # Next athlete moves down the ladder.
  assert id3 == 3
  assert rank3 > rank1
  assert pts3 < pts1

