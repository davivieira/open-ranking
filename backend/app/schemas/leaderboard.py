from typing import Optional

from pydantic import BaseModel

from ..models import Gender, Level


class AthleteRef(BaseModel):
  id: int
  name: str


class AthletePairRef(BaseModel):
  athlete1: AthleteRef
  athlete2: AthleteRef


class LeaderboardEntry(BaseModel):
  rank: int
  athlete: Optional[AthleteRef] = None
  athlete_pair: Optional[AthletePairRef] = None
  total_points: float
  event_count: int = 0
