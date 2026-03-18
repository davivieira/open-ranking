from passlib.context import CryptContext

# New passwords use Argon2; existing PBKDF2 hashes still verify.
pwd_context = CryptContext(
  schemes=["argon2", "pbkdf2_sha256"],
  deprecated="pbkdf2_sha256",
)


def hash_password(plain_password: str) -> str:
  return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
  return pwd_context.verify(plain_password, hashed_password)

