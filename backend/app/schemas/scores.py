from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from ..models import Gender, Level


class AthleteForScoreCreate(BaseModel):
  name: str = Field(..., min_length=1)
  gender: Gender
  level: Level
  doubles_level: Level
  birth_date: Optional[date] = None
  history_entries: Optional[list[str]] = None


class ScoreBase(BaseModel):
  competition_id: int
  phase_id: Optional[int] = None
  event_id: int
  time_seconds: Optional[float] = Field(None, ge=0)
  reps_points: Optional[float] = Field(None, ge=0)

  @model_validator(mode="after")
  def time_or_points(self):
    has_time = self.time_seconds is not None
    has_points = self.reps_points is not None
    if has_time == has_points:
      raise ValueError("Provide exactly one of time_seconds (athlete finished) or reps_points (time cap)")
    return self


class ScoreCreateExistingAthlete(ScoreBase):
  athlete_id: int


class ScoreCreateWithNewAthlete(ScoreBase):
  athlete: AthleteForScoreCreate


class AthleteSummary(BaseModel):
  id: int
  name: str
  gender: Gender
  level: Level
  doubles_level: Level

  class Config:
    from_attributes = True


class ScoreRead(BaseModel):
  id: int
  athlete: AthleteSummary
  partner: Optional[AthleteSummary] = None
  competition_id: int
  phase_id: Optional[int]
  event_id: int
  level: Level
  time_seconds: Optional[float] = None
  reps_points: Optional[float] = None
  rank_within_level: Optional[int]
  points_awarded: Optional[int]
  created_at: datetime
  updated_at: datetime

  class Config:
    from_attributes = True

