# app/services/market_providers/finnhub.py

import os
import httpx
from datetime import datetime
from .base import MarketProvider

FINNHUB_BASE_URL = "https://finnhub.io/api/v1"


class FinnhubProvider(MarketProvider):
    def __init__(self):
        self.api_key = os.getenv("FINNHUB_API_KEY")

    async def fetch_candles(
        self,
        instrument_key: str,
        resolution: str,
        limit: int = 100,
    ):
        if not self.api_key:
            return []

        resolution_map = {
            "1": "1",
            "5": "5",
            "15": "15",
            "60": "60",
            "D": "D",
        }

        res = resolution_map.get(resolution, "D")

        to_ts = int(datetime.utcnow().timestamp())
        from_ts = to_ts - (limit * 86400)

        params = {
            "symbol": instrument_key,
            "resolution": res,
            "from": from_ts,
            "to": to_ts,
            "token": self.api_key,
        }

        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{FINNHUB_BASE_URL}/stock/candle",
                params=params,
            )

        if r.status_code != 200:
            return []

        data = r.json()
        if data.get("s") != "ok":
            return []

        candles = []
        for i in range(len(data["t"])):
            candles.append({
                "time": data["t"][i] * 1000,
                "open": data["o"][i],
                "high": data["h"][i],
                "low": data["l"][i],
                "close": data["c"][i],
                "volume": data["v"][i],
            })

        return candles
