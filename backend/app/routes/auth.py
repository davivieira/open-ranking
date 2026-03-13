from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from ..auth.deps import get_current_user
from ..auth.hash import hash_password, verify_password
from ..auth.jwt import create_access_token
from ..config import get_settings
from ..database import get_db
from ..models import User, UserRole


router = APIRouter(prefix="/auth", tags=["auth"])

settings = get_settings()


class LoginRequest(BaseModel):
  email: EmailStr
  password: str


class RegisterRequest(BaseModel):
  email: EmailStr
  password: str


class UserOut(BaseModel):
  id: int
  email: EmailStr
  role: str

  class Config:
    from_attributes = True


class LoginResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  user: UserOut


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
  user: User | None = db.query(User).filter(User.email == payload.email).first()
  if user is None or not verify_password(payload.password, user.password_hash):
    raise HTTPException(
      status_code=status.HTTP_401_UNAUTHORIZED,
      detail="Incorrect email or password",
    )

  token = create_access_token(
    data={"sub": str(user.id)},
    expires_delta=timedelta(minutes=60),
  )

  return LoginResponse(access_token=token, user=user)  # type: ignore[arg-type]


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> LoginResponse:
  existing = db.query(User).filter(User.email == payload.email).first()
  if existing:
    raise HTTPException(
      status_code=status.HTTP_400_BAD_REQUEST,
      detail="Email already registered",
    )
  user = User(
    email=payload.email,
    password_hash=hash_password(payload.password),
    role=UserRole.ADMIN,
  )
  db.add(user)
  db.commit()
  db.refresh(user)
  token = create_access_token(
    data={"sub": str(user.id)},
    expires_delta=timedelta(minutes=60),
  )
  return LoginResponse(access_token=token, user=user)  # type: ignore[arg-type]


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
  return current_user  # type: ignore[return-value]

