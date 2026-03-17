import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Gender, Level
from ..schemas.leaderboard import LeaderboardEntry
from ..services.leaderboard import get_leaderboard

router = APIRouter(prefix="/leaderboard", tags=["leaderboard"])


@router.get("", response_model=list[LeaderboardEntry])
def list_leaderboard(
  competition_id: int = Query(..., description="Competition ID"),
  phase_id: int = Query(..., description="Phase (stage) ID"),
  level: Level = Query(..., description="Level: RX, SCALED, BEGINNER or DOUBLE_RX, etc."),
  gender: Gender = Query(..., description="MALE or FEMALE"),
  event_id: int | None = Query(default=None, description="Optional: limit to single event"),
  db: Session = Depends(get_db),
) -> list[LeaderboardEntry]:
  return get_leaderboard(
    db,
    competition_id=competition_id,
    phase_id=phase_id,
    level=level,
    gender=gender,
    event_id=event_id,
  )


def _athlete_display(entry: LeaderboardEntry) -> str:
  if entry.athlete:
    return entry.athlete.name
  if entry.athlete_pair:
    return f"{entry.athlete_pair.athlete1.name} / {entry.athlete_pair.athlete2.name}"
  return ""


@router.get("/export")
def export_leaderboard(
  competition_id: int = Query(..., description="Competition ID"),
  phase_id: int = Query(..., description="Phase (stage) ID"),
  level: Level = Query(..., description="Level"),
  gender: Gender = Query(..., description="MALE or FEMALE"),
  event_id: int | None = Query(default=None),
  format: str = Query(default="csv", description="csv (only format supported)"),
  db: Session = Depends(get_db),
) -> Response:
  if format.lower() != "csv":
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only CSV format is supported")
  entries = get_leaderboard(
    db,
    competition_id=competition_id,
    phase_id=phase_id,
    level=level,
    gender=gender,
    event_id=event_id,
  )
  slug_safe = f"c{competition_id}-p{phase_id}"
  buf = io.StringIO()
  w = csv.writer(buf)
  w.writerow(["Rank", "Athlete(s)", "Total points", "Events"])
  for e in entries:
    w.writerow([e.rank, _athlete_display(e), e.total_points, e.event_count])
  body = buf.getvalue().encode("utf-8")
  return Response(
    content=body,
    media_type="text/csv; charset=utf-8",
    headers={
      "Content-Disposition": f'attachment; filename="leaderboard-{slug_safe}.csv"',
    },
  )
