from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta
from jose import jwt

from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas import UserCreate, UserOut, UserLogin, Token
from app.crud import users as users_crud
from app.api.deps import get_db
from app.core.config import settings
from app.crud.users import verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"exp": expire, "sub": str(subject)}
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


@router.post("/signup", response_model=UserOut)
async def signup(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    existing = await users_crud.get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    user = await users_crud.create_user(db, user_in)
    return user


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    user = await users_crud.get_user_by_email(db, credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token(str(user.id))
    return Token(access_token=token)
