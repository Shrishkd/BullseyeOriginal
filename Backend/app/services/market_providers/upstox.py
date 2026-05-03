# app/services/market_providers/upstox.py

import os
import asyncio
import httpx
from datetime import datetime, timedelta, time
import pytz
from .base import MarketProvider

UPSTOX_BASE_URL = "https://api.upstox.com/v2"
IST = pytz.timezone("Asia/Kolkata")
UPSTOX_TIMEOUT = httpx.Timeout(connect=30.0, read=30.0, write=10.0, pool=10.0)
UPSTOX_MAX_RETRIES = 3
UPSTOX_RETRY_BACKOFF_SECONDS = 2

# Upstox API limitation - max date they have data for (update this as needed)
UPSTOX_MAX_DATE = datetime(2025, 10, 23).date()

def is_market_open():
    now = datetime.now(IST)
    if now.weekday() >= 5:
        return False
    return time(9, 15) <= now.time() <= time(15, 30)


class UpstoxProvider(MarketProvider):

    def __init__(self):
        self.access_token = os.getenv("UPSTOX_ACCESS_TOKEN")

    def _headers(self):
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Accept": "application/json",
        }

    async def _get_with_retries(self, client: httpx.AsyncClient, url: str, **kwargs):
        last_error = None

        for attempt in range(1, UPSTOX_MAX_RETRIES + 1):
            try:
                response = await client.get(url, headers=self._headers(), **kwargs)
                if response.status_code not in {429, 500, 502, 503, 504}:
                    return response

                last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            except (httpx.ConnectError, httpx.TimeoutException, httpx.NetworkError) as exc:
                last_error = f"{exc.__class__.__name__}: {exc}"

            if attempt < UPSTOX_MAX_RETRIES:
                wait_seconds = UPSTOX_RETRY_BACKOFF_SECONDS * attempt
                print(
                    f"Upstox request failed (attempt {attempt}/{UPSTOX_MAX_RETRIES}); "
                    f"retrying in {wait_seconds}s..."
                )
                await asyncio.sleep(wait_seconds)

        print(f"Upstox request failed after {UPSTOX_MAX_RETRIES} attempts: {last_error}")
        return None

    # ============================
    # LIVE QUOTE (LTP)
    # ============================
    async def fetch_quote(self, instrument_key: str) -> dict:
        if not self.access_token:
            return {}

        url = f"{UPSTOX_BASE_URL}/market-quote/ltp"
        params = {"instrument_key": instrument_key}

        async with httpx.AsyncClient(timeout=UPSTOX_TIMEOUT) as client:
            r = await self._get_with_retries(client, url, params=params)

        if r is None:
            return {}

        if r.status_code != 200:
            return {}

        data = r.json().get("data", {})
        q = data.get(instrument_key)
        if not q:
            return {}

        return {
            "price": float(q["last_price"]),
            "timestamp": int(datetime.now(IST).timestamp()),
        }

    # ============================
    # CANDLES (HISTORICAL + INTRADAY)
    # ============================
    async def fetch_candles(self, instrument_key: str, resolution: str, limit=100):
        if not self.access_token:
            return []

        interval_map = {
            "1": "1minute",
            "5": "1minute",      # Upstox only supports 1minute, not 5minute
            "15": "30minute",
            "30": "30minute",
            "60": "30minute",
            "D": "day",
        }

        interval = interval_map.get(resolution, "day")

        async with httpx.AsyncClient(timeout=UPSTOX_TIMEOUT) as client:

            # ======================
            # DAILY CANDLES
            # ======================
            if interval == "day":
                # Cap to_date at UPSTOX_MAX_DATE to avoid requesting unavailable future data
                real_now = datetime.now(IST).date()
                to_date = min(real_now, UPSTOX_MAX_DATE)
                from_date = to_date - timedelta(days=limit)

                from_date_str = from_date.strftime("%Y-%m-%d")
                to_date_str = to_date.strftime("%Y-%m-%d")

                url = (
                    f"{UPSTOX_BASE_URL}/historical-candle/"
                    f"{instrument_key}/day/"
                    f"{to_date_str}/{from_date_str}"  # Upstox expects to_date first, then from_date
                )

            # ======================
            # INTRADAY CANDLES
            # ======================
            else:
                url = (
                    f"{UPSTOX_BASE_URL}/historical-candle/intraday/"
                    f"{instrument_key}/{interval}"
                )

            r = await self._get_with_retries(client, url)

        if r is None:
            return []

        if r.status_code != 200:
            if r.status_code == 401 and interval != "day":
                print(f"⚠️ Upstox intraday data (401): Access denied for {interval} candles")
                print(f"   This may require a different Upstox subscription plan")
                print(f"   URL: {url}")
            else:
                print(f"Upstox candle error ({r.status_code}): {r.text}")
            return []

        raw = r.json().get("data", {}).get("candles", [])
        if not raw:
            print(f"No candle data returned for {instrument_key} with interval {interval}")
            return []

        # Take the last 'limit' candles (or all if fewer than limit)
        candles_to_process = raw[-limit:] if len(raw) > limit else raw
        
        candles = []
        for i, c in enumerate(candles_to_process):
            try:
                # Parse timestamp - Upstox returns ISO format string
                timestamp = int(datetime.fromisoformat(c[0]).timestamp() * 1000)
                
                candles.append({
                    "time": timestamp,
                    "open": float(c[1]),
                    "high": float(c[2]),
                    "low": float(c[3]),
                    "close": float(c[4]),
                    "volume": float(c[5]),
                })
            except (ValueError, IndexError, TypeError) as e:
                print(f"Error parsing candle {i}: {e} - Data: {c}")
                continue
        
        # Sort by time to ensure chronological order (oldest first)
        candles.sort(key=lambda x: x["time"])
        
        print(f"Returning {len(candles)} candles for {instrument_key} ({interval})")
        return candles
