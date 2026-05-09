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


# ---------- Portfolio Holdings ----------

class HoldingCreate(BaseModel):
    symbol: str
    quantity: float
    buy_price: float
    buy_date: datetime
    asset_type: Optional[str] = "stock"


class HoldingOut(BaseModel):
    id: int
    symbol: str
    quantity: float
    buy_price: float
    buy_date: datetime
    asset_type: str
    created_at: datetime

    class Config:
        orm_mode = True


class HoldingWithStats(HoldingOut):
    current_price: Optional[float] = None
    current_value: Optional[float] = None
    invested_value: float
    pnl: Optional[float] = None
    pnl_pct: Optional[float] = None
    allocation_pct: Optional[float] = None


class PortfolioSummary(BaseModel):
    total_invested: float
    total_current_value: Optional[float]
    total_pnl: Optional[float]
    total_pnl_pct: Optional[float]
    holdings_count: int
    last_updated: datetime


class CSVImportResult(BaseModel):
    imported: int
    failed: int
    errors: List[dict]