# app/api/v1/market.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas import PriceIn, PriceOut, AssetOut
from app.crud import assets as assets_crud, prices as prices_crud
from app.api.deps import get_db, get_current_user

from app.services.indicators import sma, ema, rsi
from app.services.market_providers.router import get_provider
from app.services.market_providers.upstox import is_market_open

router = APIRouter(prefix="/market", tags=["market"])


# ===============================
# INGEST PRICE (manual / bots)
# ===============================
@router.post("/prices/ingest")
async def ingest_price(
    payload: PriceIn,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    asset = await assets_crud.create_asset_if_not_exists(
        db, payload.asset_symbol
    )

    price = await prices_crud.create_price(
        db,
        asset_id=asset.id,
        timestamp=payload.timestamp,
        open=payload.open,
        high=payload.high,
        low=payload.low,
        close=payload.close,
        volume=payload.volume,
    )

    return {"status": "ok", "price_id": price.id}


# ===============================
# ASSET METADATA
# ===============================
@router.get("/assets/{symbol}", response_model=AssetOut)
async def get_asset(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    asset = await assets_crud.get_asset_by_symbol(db, symbol)
    if not asset:
        raise HTTPException(404, "Asset not found")
    return asset


# ===============================
# RECENT PRICES (DB)
# ===============================
@router.get("/prices/{symbol}", response_model=list[PriceOut])
async def get_recent_prices(
    symbol: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    asset = await assets_crud.get_asset_by_symbol(db, symbol)
    if not asset:
        raise HTTPException(404, "Asset not found")

    prices = await prices_crud.get_recent_prices(db, asset.id, limit)
    return prices[::-1]  # oldest → newest


# ===============================
# QUOTE (LTP, INR)
# ===============================
@router.get("/quote/{symbol}")
async def get_quote(
    symbol: str,
    user=Depends(get_current_user),
):
    """
    Latest LTP for the given NSE symbol.
    Resolves symbol via existing logic, fetches from Upstox.
    """
    try:
        provider, resolved_symbol = await get_provider(symbol)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unsupported symbol: {symbol}",
        )

    if not resolved_symbol or "|" not in resolved_symbol:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unsupported symbol: {symbol}",
        )

    quote = await provider.fetch_quote(resolved_symbol)
    price = quote.get("price") if quote else None
    if price is not None:
        price = float(price)

    return {
        "symbol": symbol.upper(),
        "price": price,
        "currency": "INR",
        "market_open": is_market_open(),
    }


# ===============================
# CANDLES (Upstox)
# ===============================
@router.get("/candles/{symbol}")
async def get_candles(
    symbol: str,
    resolution: str = "5",
    period: int = 14,
    user=Depends(get_current_user)
):
    """
    Unified candle endpoint.
    Uses provider router (Upstox).
    """

    provider, resolved_symbol = await get_provider(symbol)

    if not resolved_symbol or "|" not in resolved_symbol:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unsupported symbol: {symbol}"
        )

    candles = await provider.fetch_candles(
        instrument_key=resolved_symbol,
        resolution=resolution,
    )

    if not candles:
        return []

    # ===============================
    # Indicators
    # ===============================
    closes = [c["close"] for c in candles]

    sma_vals = sma(closes, period)
    ema_vals = ema(closes, period)
    rsi_vals = rsi(closes, period)

    for i, c in enumerate(candles):
        c["sma"] = sma_vals[i] if i < len(sma_vals) else None
        c["ema"] = ema_vals[i] if i < len(ema_vals) else None
        c["rsi"] = rsi_vals[i] if i < len(rsi_vals) else None

    return candles
