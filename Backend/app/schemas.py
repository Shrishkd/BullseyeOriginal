from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ---------- Auth / Users ----------

class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(UserBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- Assets / Prices ----------

class AssetBase(BaseModel):
    symbol: str
    name: Optional[str] = None
    type: Optional[str] = "stock"


class AssetOut(AssetBase):
    id: int

    class Config:
        orm_mode = True


class PriceIn(BaseModel):
    asset_symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float


class PriceOut(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float

    class Config:
        orm_mode = True


# ---------- Chat ----------

class ChatRequest(BaseModel):
    question: str
    top_k: int = 5


class ChatResponse(BaseModel):
    answer: str
    sources: List[str] = []
