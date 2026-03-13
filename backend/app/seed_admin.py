import os

from sqlalchemy.orm import Session

from .auth.hash import hash_password
from .database import SessionLocal
from .models import User, UserRole


def seed_admin() -> None:
  initial_email = os.getenv("INITIAL_ADMIN_EMAIL")
  initial_password = os.getenv("INITIAL_ADMIN_PASSWORD")

  if not initial_email or not initial_password:
    raise SystemExit(
      "INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be set to seed an admin user."
    )

  db: Session = SessionLocal()
  try:
    existing_admin = (
      db.query(User)
      .filter(User.role == UserRole.ADMIN)
      .order_by(User.id.asc())
      .first()
    )
    if existing_admin:
      # Always ensure the primary admin matches the configured credentials.
      existing_admin.email = initial_email
      existing_admin.password_hash = hash_password(initial_password)
      db.commit()
      print(f"Updated existing admin user to {initial_email}")
    else:
      user = User(
        email=initial_email,
        password_hash=hash_password(initial_password),
        role=UserRole.ADMIN,
      )
      db.add(user)
      db.commit()
      print(f"Seeded initial admin user with email: {initial_email}")
  finally:
    db.close()


if __name__ == "__main__":
  seed_admin()

