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
  weight_kg: Optional[float] = Field(None, ge=0)

  @model_validator(mode="after")
  def exactly_one_result_type(self):
    n = sum(
      1
      for v in (self.time_seconds, self.reps_points, self.weight_kg)
      if v is not None
    )
    if n != 1:
      raise ValueError(
        "Provide exactly one of time_seconds (finished with time), "
        "reps_points (did not finish / reps), or weight_kg (load)"
      )
    return self


class ScoreCreateExistingAthlete(ScoreBase):
  athlete_id: int


class ScoreCreateWithNewAthlete(ScoreBase):
  athlete: AthleteForScoreCreate


class ScoreUpdate(BaseModel):
  """Exactly one of time_seconds, reps_points, or weight_kg (same semantics as create)."""

  time_seconds: Optional[float] = Field(None, ge=0)
  reps_points: Optional[float] = Field(None, ge=0)
  weight_kg: Optional[float] = Field(None, ge=0)

  @model_validator(mode="after")
  def exactly_one_result_type(self):
    n = sum(
      1
      for v in (self.time_seconds, self.reps_points, self.weight_kg)
      if v is not None
    )
    if n != 1:
      raise ValueError(
        "Provide exactly one of time_seconds (finished with time), "
        "reps_points (did not finish / reps), or weight_kg (load)"
      )
    return self


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
  weight_kg: Optional[float] = None
  rank_within_level: Optional[int]
  points_awarded: Optional[int]
  created_at: datetime
  updated_at: datetime

  class Config:
    from_attributes = True

