from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from ..models import CompetitionType, GenderCategory, PhaseEventModes, EventType


class CompetitionCreate(BaseModel):
  name: str = Field(..., min_length=1)
  slug: str = Field(..., min_length=1)
  type: CompetitionType
  year: Optional[int] = None
  description: Optional[str] = None
  is_active: bool = True


class CompetitionUpdate(BaseModel):
  name: Optional[str] = Field(None, min_length=1)
  slug: Optional[str] = Field(None, min_length=1)
  type: Optional[CompetitionType] = None
  year: Optional[int] = None
  description: Optional[str] = None
  is_active: Optional[bool] = None


class CompetitionRead(BaseModel):
  id: int
  name: str
  slug: str
  public_slug: str
  type: CompetitionType
  year: Optional[int]
  description: Optional[str]
  is_active: bool
  created_at: datetime
  updated_at: datetime

  class Config:
    from_attributes = True


class PhaseCreate(BaseModel):
  code: Optional[str] = Field(None, min_length=1)
  name: str = Field(..., min_length=1)
  order_index: Optional[int] = None
  event_modes: PhaseEventModes = PhaseEventModes.BOTH


class PhaseUpdate(BaseModel):
  code: Optional[str] = Field(None, min_length=1)
  name: Optional[str] = Field(None, min_length=1)
  order_index: Optional[int] = None
  event_modes: Optional[PhaseEventModes] = None


class PhaseRead(BaseModel):
  id: int
  competition_id: int
  code: str
  name: str
  order_index: int
  event_modes: PhaseEventModes
  created_at: datetime
  updated_at: datetime

  class Config:
    from_attributes = True


class EventCreate(BaseModel):
  code: Optional[str] = Field(None, min_length=1)
  name: str = Field(..., min_length=1)
  description: Optional[str] = None
  order_index: Optional[int] = None
  event_type: EventType = EventType.SINGLES
  gender_category: GenderCategory = GenderCategory.MIXED


class EventUpdate(BaseModel):
  code: Optional[str] = Field(None, min_length=1)
  name: Optional[str] = Field(None, min_length=1)
  description: Optional[str] = None
  order_index: Optional[int] = None
  event_type: Optional[EventType] = None
  gender_category: Optional[GenderCategory] = None


class EventRead(BaseModel):
  id: int
  phase_id: int
  code: str
  name: str
  description: Optional[str]
  order_index: int
  event_type: EventType
  gender_category: GenderCategory
  is_finished: bool = False
  created_at: datetime
  updated_at: datetime

  class Config:
    from_attributes = True
