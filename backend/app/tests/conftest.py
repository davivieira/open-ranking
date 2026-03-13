import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base


@pytest.fixture
def db_session():
  """
  Provide a fresh in-memory SQLite database session for each test.
  This avoids touching the real Postgres instance and keeps tests fast.
  """
  engine = create_engine("sqlite:///:memory:", future=True)
  TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

  Base.metadata.create_all(bind=engine)

  db = TestingSessionLocal()
  try:
    yield db
  finally:
    db.close()

