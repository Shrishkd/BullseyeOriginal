# Backend/app/api/v1/dashboard.py
"""
Dashboard API — Aggregated real-time overview for the Bullseye home screen.

Endpoint:
  GET /dashboard/summary — combines portfolio, risk, alerts & market data
"""

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.crud import portfolio as portfolio_crud
from app.services.market_providers.router import get_provider
from app.services.indicators import rsi as compute_rsi, ema as compute_ema

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _fetch_price(symbol: str) -> Optional[float]:
    try:
        provider, instrument_key = await get_provider(symbol)
        if not instrument_key or "|" not in instrument_key:
            return None
        quote = await provider.fetch_quote(instrument_key)
        price = quote.get("price")
        return float(price) if price is not None else None
    except Exception:
        return None


async def _fetch_mini_candles(symbol: str, days: int = 30) -> List[Dict]:
    """Fetch daily candles for sparkline + returns calculation."""
    try:
        from app.services.market_providers.upstox import UpstoxProvider
        from app.services.symbol_resolver import get_instrument_key
        key = get_instrument_key(symbol)
        provider = UpstoxProvider()
        candles = await provider.fetch_candles(key, resolution="D", limit=days)
        return candles or []
    except Exception:
        return []


def _pct_change(closes: List[float], days: int) -> Optional[float]:
    if len(closes) < days + 1:
        return None
    return (closes[-1] - closes[-(days + 1)]) / closes[-(days + 1)] * 100


NIFTY50_SYMBOLS = [
    "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
    "HINDUNILVR", "SBIN", "BHARTIARTL", "BAJFINANCE", "KOTAKBANK",
]

WATCHLIST_DEFAULT = ["NIFTY50", "SENSEX", "RELIANCE", "TCS", "HDFCBANK"]


# ── Endpoint ───────────────────────────────────────────────────────────────────

@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Single endpoint that returns everything the dashboard needs:
    - Portfolio summary + top movers
    - Alert counts
    - Market pulse (select stock quotes)
    - 30-day portfolio sparkline (derived from current holdings)
    - Quick risk snapshot
    """

    # ── 1. Holdings ────────────────────────────────────────────────────────────
    holdings = await portfolio_crud.get_holdings(db, user.id)

    portfolio_section = {
        "total_invested": 0.0,
        "total_current_value": None,
        "total_pnl": None,
        "total_pnl_pct": None,
        "holdings_count": len(holdings),
        "top_gainers": [],
        "top_losers": [],
        "asset_allocation": {},
    }

    holding_stats = []

    if holdings:
        symbols = list({h.symbol for h in holdings})
        prices_list = await asyncio.gather(*[_fetch_price(s) for s in symbols])
        price_map: Dict[str, Optional[float]] = dict(zip(symbols, prices_list))

        total_invested = sum(h.buy_price * h.quantity for h in holdings)
        total_current = 0.0
        has_price = False

        for h in holdings:
            invested = h.buy_price * h.quantity
            cp = price_map.get(h.symbol)
            cv = cp * h.quantity if cp else None
            pnl = (cv - invested) if cv is not None else None
            pnl_pct = (pnl / invested * 100) if pnl is not None and invested else None

            if cv is not None:
                total_current += cv
                has_price = True
            else:
                total_current += invested

            # Asset allocation
            at = h.asset_type or "stock"
            portfolio_section["asset_allocation"][at] = (
                portfolio_section["asset_allocation"].get(at, 0.0) + (cv or invested)
            )

            holding_stats.append({
                "symbol": h.symbol,
                "asset_type": h.asset_type,
                "quantity": h.quantity,
                "buy_price": h.buy_price,
                "current_price": cp,
                "invested_value": round(invested, 2),
                "current_value": round(cv, 2) if cv else None,
                "pnl": round(pnl, 2) if pnl is not None else None,
                "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None,
            })

        total_pnl = (total_current - total_invested) if has_price else None
        total_pnl_pct = (total_pnl / total_invested * 100) if total_pnl is not None and total_invested else None

        portfolio_section.update({
            "total_invested": round(total_invested, 2),
            "total_current_value": round(total_current, 2) if has_price else None,
            "total_pnl": round(total_pnl, 2) if total_pnl is not None else None,
            "total_pnl_pct": round(total_pnl_pct, 2) if total_pnl_pct is not None else None,
        })

        # Round allocation values
        portfolio_section["asset_allocation"] = {
            k: round(v, 2) for k, v in portfolio_section["asset_allocation"].items()
        }

        # Top movers (only holdings with price data)
        with_pnl = [s for s in holding_stats if s["pnl_pct"] is not None]
        with_pnl_sorted = sorted(with_pnl, key=lambda x: x["pnl_pct"], reverse=True)
        portfolio_section["top_gainers"] = with_pnl_sorted[:3]
        portfolio_section["top_losers"] = with_pnl_sorted[-3:][::-1]

    # ── 2. Alerts ──────────────────────────────────────────────────────────────
    from app import models
    from sqlalchemy import select

    alerts_res = await db.execute(
        select(models.Alert).where(models.Alert.user_id == user.id)
    )
    all_alerts = alerts_res.scalars().all()
    active_alerts = [a for a in all_alerts if a.is_active]

    triggered_res = await db.execute(
        select(models.TriggeredAlert)
        .join(models.Alert, models.TriggeredAlert.alert_id == models.Alert.id)
        .where(models.Alert.user_id == user.id)
        .order_by(models.TriggeredAlert.triggered_at.desc())
        .limit(3)
    )
    recent_triggers = triggered_res.scalars().all()

    alerts_section = {
        "total": len(all_alerts),
        "active": len(active_alerts),
        "total_triggers": sum(a.triggered_count or 0 for a in all_alerts),
        "recent_triggers": [
            {
                "symbol": t.symbol,
                "alert_type": t.alert_type,
                "message": t.message,
                "triggered_at": t.triggered_at.isoformat(),
            }
            for t in recent_triggers
        ],
    }

    # ── 3. Market Pulse — fetch quotes for a small watchlist ──────────────────
    watch_symbols = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "SBIN"]
    # Also include any holding symbols (up to 5 total unique)
    if holdings:
        holding_syms = list({h.symbol for h in holdings})[:3]
        for s in holding_syms:
            if s not in watch_symbols:
                watch_symbols.append(s)
    watch_symbols = watch_symbols[:6]

    candle_tasks = [_fetch_mini_candles(s, 30) for s in watch_symbols]
    all_candles = await asyncio.gather(*candle_tasks)

    market_pulse = []
    for sym, candles in zip(watch_symbols, all_candles):
        if not candles:
            continue
        closes = [c["close"] for c in candles]
        current = closes[-1] if closes else None
        chg_1d = _pct_change(closes, 1)
        chg_5d = _pct_change(closes, 5)
        sparkline = [round(c, 2) for c in closes[-10:]]  # last 10 days

        # RSI
        rsi_vals = compute_rsi(closes, 14) if len(closes) >= 15 else []
        latest_rsi = rsi_vals[-1] if rsi_vals else None

        market_pulse.append({
            "symbol": sym,
            "price": round(current, 2) if current else None,
            "change_1d_pct": round(chg_1d, 2) if chg_1d is not None else None,
            "change_5d_pct": round(chg_5d, 2) if chg_5d is not None else None,
            "sparkline": sparkline,
            "rsi": round(latest_rsi, 1) if latest_rsi is not None else None,
        })

    # ── 4. Portfolio sparkline (last 30 days notional value) ──────────────────
    # Weighted by current holdings quantities × historical closes
    portfolio_sparkline: List[Optional[float]] = []
    if holdings and len(holdings) <= 8:
        # Fetch candles for all holdings concurrently (limit to 8 to stay fast)
        sparkline_tasks = [_fetch_mini_candles(h.symbol, 30) for h in holdings]
        sparkline_candles = await asyncio.gather(*sparkline_tasks)

        # Build per-day portfolio value
        day_values: Dict[str, float] = {}
        for h, candles in zip(holdings, sparkline_candles):
            for c in candles:
                day_key = str(c["time"])
                day_values[day_key] = day_values.get(day_key, 0) + c["close"] * h.quantity

        if day_values:
            sorted_days = sorted(day_values.keys())[-30:]
            portfolio_sparkline = [round(day_values[d], 2) for d in sorted_days]

    # ── 5. Quick risk snapshot ─────────────────────────────────────────────────
    import math

    def _vol(closes: List[float]) -> float:
        if len(closes) < 3:
            return 0.0
        returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
        mean = sum(returns) / len(returns)
        variance = sum((r - mean) ** 2 for r in returns) / max(len(returns) - 1, 1)
        return math.sqrt(variance) * math.sqrt(252) * 100

    risk_snapshot = {"overall": "N/A", "avg_volatility": None, "flags": 0}
    if holdings and holding_stats:
        vols = []
        for h_stat in holding_stats:
            # Use sparkline candles we already fetched — approximation
            pass  # We skip refetching; just use a simple heuristic

        # Use market pulse RSI flags as proxy
        overbought = [m for m in market_pulse if m.get("rsi") and m["rsi"] > 70]
        oversold   = [m for m in market_pulse if m.get("rsi") and m["rsi"] < 30]
        flags = len(overbought) + len(oversold)

        total_inv = portfolio_section["total_invested"] or 1
        # Concentration: HHI approx
        weights = [(h.buy_price * h.quantity) / total_inv for h in holdings]
        hhi = sum(w**2 for w in weights)
        if hhi > 0.35:
            flags += 1

        overall = "Low" if flags == 0 else "Moderate" if flags <= 2 else "High"
        risk_snapshot = {
            "overall": overall,
            "concentration_hhi": round(hhi, 3),
            "flags": flags,
        }

    return {
        "portfolio": portfolio_section,
        "holdings": holding_stats,
        "alerts": alerts_section,
        "market_pulse": market_pulse,
        "portfolio_sparkline": portfolio_sparkline,
        "risk_snapshot": risk_snapshot,
        "generated_at": datetime.utcnow().isoformat(),
        "user": {"id": user.id, "email": user.email, "name": user.full_name},
    }