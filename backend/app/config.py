import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


class Settings:
  def __init__(self) -> None:
    self.database_url: str = os.getenv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@db:5432/open_ranking",
    )
    self.debug: bool = os.getenv("DEBUG", "false").lower() == "true"
    self.jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "change-me-in-prod")
    self.jwt_algorithm: str = "HS256"


@lru_cache
def get_settings() -> Settings:
  return Settings()

