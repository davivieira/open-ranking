from typing import Optional

from pydantic import BaseModel, Field

from ..models import CompetitionType, EventType, GenderCategory, PhaseEventModes


class EventImport(BaseModel):
  code: Optional[str] = None
  name: str = Field(..., min_length=1)
  description: Optional[str] = None
  order_index: Optional[int] = None
  event_type: EventType = EventType.SINGLES
  gender_category: GenderCategory = GenderCategory.MIXED


class PhaseImport(BaseModel):
  code: Optional[str] = None
  name: str = Field(..., min_length=1)
  order_index: Optional[int] = None
  event_modes: PhaseEventModes = PhaseEventModes.BOTH
  events: list[EventImport] = []


class CompetitionImport(BaseModel):
  name: str = Field(..., min_length=1)
  slug: str = Field(..., min_length=1)
  type: CompetitionType = CompetitionType.OTHER
  year: Optional[int] = None
  description: Optional[str] = None
  phases: list[PhaseImport] = []


class ImportPayload(BaseModel):
  competitions: list[CompetitionImport] = Field(..., max_length=50)
