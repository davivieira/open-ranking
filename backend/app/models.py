from datetime import date, datetime
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
  Boolean,
  Date,
  DateTime,
  Enum,
  ForeignKey,
  Integer,
  String,
  Text,
  UniqueConstraint,
  Float,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class CompetitionType(str, PyEnum):
  OPEN = "OPEN"
  STRONG_GAMES = "STRONG_GAMES"
  OTHER = "OTHER"


class Level(str, PyEnum):
  RX = "RX"
  SCALED = "SCALED"
  BEGINNER = "BEGINNER"
  DOUBLE_RX = "DOUBLE_RX"
  DOUBLE_SCALED = "DOUBLE_SCALED"
  DOUBLE_BEGINNER = "DOUBLE_BEGINNER"


class Gender(str, PyEnum):
  MALE = "MALE"
  FEMALE = "FEMALE"


class PhaseEventModes(str, PyEnum):
  SINGLES_ONLY = "SINGLES_ONLY"
  DOUBLES_ONLY = "DOUBLES_ONLY"
  BOTH = "BOTH"


class EventType(str, PyEnum):
  SINGLES = "SINGLES"
  DOUBLES = "DOUBLES"


class GenderCategory(str, PyEnum):
  MALE = "MALE"
  FEMALE = "FEMALE"
  MIXED = "MIXED"


class UserRole(str, PyEnum):
  ADMIN = "ADMIN"
  VIEWER = "VIEWER"


class TimestampMixin:
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=datetime.utcnow
  )
  updated_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
  )


class Competition(Base, TimestampMixin):
  __tablename__ = "competitions"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
  name: Mapped[str] = mapped_column(String(255), nullable=False)
  slug: Mapped[str] = mapped_column(String(255), nullable=False)
  public_slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
  type: Mapped[CompetitionType] = mapped_column(Enum(CompetitionType), nullable=False)
  year: Mapped[int | None]
  description: Mapped[str | None] = mapped_column(Text)
  is_active: Mapped[bool] = mapped_column(Boolean, default=True)

  user: Mapped["User"] = relationship(back_populates="competitions")
  phases: Mapped[list["Phase"]] = relationship(back_populates="competition")
  scores: Mapped[list["Score"]] = relationship(back_populates="competition")
  history_entries: Mapped[list["AthleteHistory"]] = relationship(
    back_populates="competition"
  )

  __table_args__ = (
    UniqueConstraint("user_id", "slug", name="uq_competition_user_slug"),
  )


class Phase(Base, TimestampMixin):
  __tablename__ = "phases"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), nullable=False)
  code: Mapped[str] = mapped_column(String(50), nullable=False)
  name: Mapped[str] = mapped_column(String(255), nullable=False)
  order_index: Mapped[int] = mapped_column(Integer, default=0)
  event_modes: Mapped[PhaseEventModes] = mapped_column(
    Enum(PhaseEventModes), default=PhaseEventModes.BOTH, nullable=False
  )

  competition: Mapped["Competition"] = relationship(back_populates="phases")
  events: Mapped[list["Event"]] = relationship(back_populates="phase")
  scores: Mapped[list["Score"]] = relationship(back_populates="phase")
  history_entries: Mapped[list["AthleteHistory"]] = relationship(
    back_populates="phase"
  )

  __table_args__ = (
    UniqueConstraint("competition_id", "code", name="uq_phase_competition_code"),
  )


class Event(Base, TimestampMixin):
  __tablename__ = "events"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  phase_id: Mapped[int] = mapped_column(ForeignKey("phases.id"), nullable=False)
  code: Mapped[str] = mapped_column(String(50), nullable=False)
  name: Mapped[str] = mapped_column(String(255), nullable=False)
  description: Mapped[str | None] = mapped_column(Text)
  order_index: Mapped[int] = mapped_column(Integer, default=0)
  event_type: Mapped[EventType] = mapped_column(
    Enum(EventType), default=EventType.SINGLES, nullable=False
  )
  gender_category: Mapped[GenderCategory] = mapped_column(
    Enum(GenderCategory), default=GenderCategory.MIXED, nullable=False
  )
  is_finished: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

  phase: Mapped["Phase"] = relationship(back_populates="events")
  scores: Mapped[list["Score"]] = relationship(back_populates="event")
  history_entries: Mapped[list["AthleteHistory"]] = relationship(
    back_populates="event"
  )

  __table_args__ = (
    UniqueConstraint("phase_id", "code", name="uq_event_phase_code"),
  )


class Athlete(Base, TimestampMixin):
  __tablename__ = "athletes"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
  name: Mapped[str] = mapped_column(String(255), nullable=False)
  gender: Mapped[Gender] = mapped_column(Enum(Gender), nullable=False)
  level: Mapped[Level] = mapped_column(Enum(Level), nullable=False)
  doubles_level: Mapped[Level] = mapped_column(Enum(Level), nullable=False)
  birth_date: Mapped[date | None] = mapped_column(Date)

  user: Mapped["User"] = relationship(back_populates="athletes")
  scores: Mapped[list["Score"]] = relationship(
    back_populates="athlete", foreign_keys="Score.athlete_id"
  )
  scores_as_partner: Mapped[list["Score"]] = relationship(
    back_populates="partner", foreign_keys="Score.partner_id"
  )
  history_entries: Mapped[list["AthleteHistory"]] = relationship(
    back_populates="athlete"
  )


class AthleteHistory(Base, TimestampMixin):
  __tablename__ = "athlete_history"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  athlete_id: Mapped[int] = mapped_column(ForeignKey("athletes.id"), nullable=False)
  competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), nullable=False)
  phase_id: Mapped[int | None] = mapped_column(ForeignKey("phases.id"))
  event_id: Mapped[int | None] = mapped_column(ForeignKey("events.id"))
  entry: Mapped[str] = mapped_column(Text, nullable=False)
  podium_rank: Mapped[int | None] = mapped_column(Integer, nullable=True)
  level: Mapped[Level | None] = mapped_column(Enum(Level), nullable=True)

  athlete: Mapped["Athlete"] = relationship(back_populates="history_entries")
  competition: Mapped["Competition"] = relationship(back_populates="history_entries")
  phase: Mapped["Phase"] = relationship(back_populates="history_entries")
  event: Mapped["Event"] = relationship(back_populates="history_entries")


class Score(Base, TimestampMixin):
  __tablename__ = "scores"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  athlete_id: Mapped[int] = mapped_column(ForeignKey("athletes.id"), nullable=False)
  partner_id: Mapped[int | None] = mapped_column(ForeignKey("athletes.id"), nullable=True)
  competition_id: Mapped[int] = mapped_column(ForeignKey("competitions.id"), nullable=False)
  phase_id: Mapped[int | None] = mapped_column(ForeignKey("phases.id"))
  event_id: Mapped[int] = mapped_column(ForeignKey("events.id"), nullable=False)
  level: Mapped[Level] = mapped_column(Enum(Level), nullable=False)
  time_seconds: Mapped[float | None] = mapped_column(Float, nullable=True)
  reps_points: Mapped[float | None] = mapped_column(Float, nullable=True)
  rank_within_level: Mapped[int | None] = mapped_column(Integer)
  points_awarded: Mapped[int | None] = mapped_column(Integer)

  athlete: Mapped["Athlete"] = relationship(
    back_populates="scores", foreign_keys=[athlete_id]
  )
  partner: Mapped[Optional["Athlete"]] = relationship(
    back_populates="scores_as_partner", foreign_keys=[partner_id]
  )
  competition: Mapped["Competition"] = relationship(back_populates="scores")
  phase: Mapped["Phase"] = relationship(back_populates="scores")
  event: Mapped["Event"] = relationship(back_populates="scores")

  __table_args__ = (
    # Prevent duplicate scores for the same event/level/athlete(+partner).
    UniqueConstraint(
      "event_id",
      "level",
      "athlete_id",
      "partner_id",
      name="uq_score_event_level_athlete_partner",
    ),
  )

  __table_args__ = (
    # Prevent exact duplicate scores for the same event/level/athlete pair.
    UniqueConstraint(
      "event_id",
      "level",
      "athlete_id",
      "partner_id",
      name="uq_score_event_level_athlete_partner",
    ),
  )


class User(Base, TimestampMixin):
  __tablename__ = "users"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
  password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
  role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.ADMIN, nullable=False)

  competitions: Mapped[list["Competition"]] = relationship(
    back_populates="user", foreign_keys="Competition.user_id"
  )
  athletes: Mapped[list["Athlete"]] = relationship(
    back_populates="user", foreign_keys="Athlete.user_id"
  )
  audit_logs: Mapped[list["AuditLog"]] = relationship(
    back_populates="user", foreign_keys="AuditLog.user_id"
  )


class AuditLog(Base, TimestampMixin):
  __tablename__ = "audit_logs"

  id: Mapped[int] = mapped_column(primary_key=True, index=True)
  user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
  action: Mapped[str] = mapped_column(String(100), nullable=False)
  resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
  resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
  details: Mapped[str | None] = mapped_column(Text, nullable=True)

  user: Mapped["User"] = relationship(back_populates="audit_logs")

