from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models
from app.schemas import UserCreate
import bcrypt


def hash_password(password: str) -> str:
    pwd_bytes = password[:72].encode("utf-8")
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    pwd_bytes = plain[:72].encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed.encode("utf-8"))


async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(
        select(models.User).where(models.User.email == email)
    )
    return result.scalars().first()


async def get_user_by_id(db: AsyncSession, user_id: int):
    result = await db.execute(
        select(models.User).where(models.User.id == user_id)
    )
    return result.scalars().first()


async def create_user(db: AsyncSession, user_in: UserCreate):
    hashed = hash_password(user_in.password)
    user = models.User(
        email=user_in.email,
        hashed_password=hashed,
        full_name=user_in.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
