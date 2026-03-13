from datetime import date
from typing import Optional

from pydantic import BaseModel, Field

from ..models import Gender, Level


class AthleteCreate(BaseModel):
  name: str = Field(..., min_length=1)
  gender: Gender
  level: Level
  doubles_level: Level
  birth_date: Optional[date] = None


class AthleteUpdate(BaseModel):
  name: Optional[str] = Field(None, min_length=1)
  gender: Optional[Gender] = None
  level: Optional[Level] = None
  doubles_level: Optional[Level] = None
  birth_date: Optional[date] = None


class AthleteProfile(BaseModel):
  id: int
  name: str
  gender: Gender
  level: Level
  doubles_level: Level
  birth_date: Optional[date] = None
  age: Optional[int] = None
  events_participated: int = 0

  class Config:
    from_attributes = True


class AthleteHistoryRead(BaseModel):
  id: int
  athlete_id: int
  competition_id: int
  phase_id: Optional[int] = None
  event_id: Optional[int] = None
  entry: str
  competition_public_slug: Optional[str] = None
  competition_year: Optional[int] = None
  phase_name: Optional[str] = None
  podium_rank: Optional[int] = None
   # Level the athlete competed at for this entry (singles or doubles)
  level: Optional[Level] = None
  event_name: Optional[str] = None
  event_description: Optional[str] = None
  winner_name: Optional[str] = None
  winner_result: Optional[str] = None
  athlete_result: Optional[str] = None

  class Config:
    from_attributes = True
