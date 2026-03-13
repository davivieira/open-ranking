from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, UserRole
from .jwt import decode_token


security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
  credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security_scheme)],
  db: Session = Depends(get_db),
) -> User:
  if credentials is None or not credentials.scheme.lower() == "bearer":
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

  try:
    payload = decode_token(credentials.credentials)
  except ValueError:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

  user_id = payload.get("sub")
  if user_id is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

  user = db.get(User, int(user_id))
  if user is None:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

  return user


def get_current_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
  if current_user.role != UserRole.ADMIN:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
  return current_user


def get_current_admin_or_viewer(
  current_user: Annotated[User, Depends(get_current_user)],
) -> User:
  if current_user.role not in (UserRole.ADMIN, UserRole.VIEWER):
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
  return current_user

