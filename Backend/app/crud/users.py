from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models
from app.schemas import UserCreate
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


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
