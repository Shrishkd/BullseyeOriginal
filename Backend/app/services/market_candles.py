# app/api/v1/market_candles.py

from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.services.market_providers.router import get_provider

router = APIRouter()


@router.get("/market/candles/{symbol}")
async def get_candles(
    symbol: str,
    resolution: str = Query("5", regex="^(1|5|15|60|D)$"),
    limit: int = 100,
    user=Depends(get_current_user),
):
    """
    Unified candle endpoint.
    Automatically selects Upstox (India) or Finnhub (global).
    """

    provider, instrument_key = await get_provider(symbol)

    candles = await provider.fetch_candles(
        instrument_key=instrument_key,
        resolution=resolution,
        limit=limit,
    )

    return candles
