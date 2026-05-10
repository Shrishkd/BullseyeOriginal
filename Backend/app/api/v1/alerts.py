# Backend/app/api/v1/alerts.py
"""
Alerts API — Real-time market monitoring & warning system.

Alert types:
  - price_above / price_below   — LTP crosses a threshold
  - rsi_overbought / rsi_oversold — RSI crosses 70/30
  - pnl_drop                    — portfolio drops by X%
  - volume_spike                — unusual volume

Endpoints:
  GET    /alerts/               — list user alerts
  POST   /alerts/               — create an alert
  PUT    /alerts/{id}           — update (enable/disable)
  DELETE /alerts/{id}           — delete
  GET    /alerts/check          — manual trigger: check all alerts
  GET    /alerts/triggered      — list recently triggered alerts
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.sql import func

from app.api.deps import get_db, get_current_user
from app.db.session import Base
from app.services.market_providers.router import get_provider
from app.services.indicators import rsi as compute_rsi
from app.services.market_providers.upstox import UpstoxProvider
from app.services.symbol_resolver import get_instrument_key

router = APIRouter(prefix="/alerts", tags=["alerts"])

# ── Inline models (to avoid circular imports) ──────────────────────────────────
# These are defined in models.py too — shown here for completeness

ALERT_TYPES = [
    "price_above",
    "price_below",
    "rsi_overbought",
    "rsi_oversold",
    "pnl_change",
    "volume_spike",
]

# ── Pydantic schemas ───────────────────────────────────────────────────────────

class AlertCreate(BaseModel):
    symbol: str
    alert_type: str           # see ALERT_TYPES
    threshold: float          # e.g. price level, RSI level, % drop
    note: Optional[str] = None

class AlertUpdate(BaseModel):
    is_active: Optional[bool] = None
    threshold: Optional[float] = None
    note: Optional[str] = None

class AlertOut(BaseModel):
    id: int
    symbol: str
    alert_type: str
    threshold: float
    note: Optional[str]
    is_active: bool
    triggered_count: int
    last_triggered: Optional[datetime]
    created_at: datetime

    class Config:
        orm_mode = True

class TriggeredAlertOut(BaseModel):
    id: int
    alert_id: int
    symbol: str
    alert_type: str
    threshold: float
    current_value: float
    message: str
    triggered_at: datetime

    class Config:
        orm_mode = True

# ── DB CRUD helpers (inline — assumes models are in app.models) ────────────────

async def _get_alert_model():
    """Import here to avoid circular import."""
    from app import models
    return models.Alert, models.TriggeredAlert

async def get_alerts(db: AsyncSession, user_id: int):
    from app import models
    res = await db.execute(
        select(models.Alert)
        .where(models.Alert.user_id == user_id)
        .order_by(models.Alert.created_at.desc())
    )
    return res.scalars().all()

async def get_alert_by_id(db: AsyncSession, alert_id: int, user_id: int):
    from app import models
    res = await db.execute(
        select(models.Alert).where(
            models.Alert.id == alert_id,
            models.Alert.user_id == user_id,
        )
    )
    return res.scalars().first()

async def create_alert(db: AsyncSession, user_id: int, data: AlertCreate):
    from app import models
    a = models.Alert(
        user_id=user_id,
        symbol=data.symbol.upper().strip(),
        alert_type=data.alert_type,
        threshold=data.threshold,
        note=data.note,
    )
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return a

async def record_trigger(db: AsyncSession, alert, current_value: float, message: str):
    from app import models
    t = models.TriggeredAlert(
        alert_id=alert.id,
        symbol=alert.symbol,
        alert_type=alert.alert_type,
        threshold=alert.threshold,
        current_value=current_value,
        message=message,
    )
    db.add(t)
    alert.triggered_count = (alert.triggered_count or 0) + 1
    alert.last_triggered = datetime.utcnow()
    db.add(alert)
    await db.commit()
    return t

async def get_triggered(db: AsyncSession, user_id: int, limit: int = 50):
    from app import models
    res = await db.execute(
        select(models.TriggeredAlert)
        .join(models.Alert, models.TriggeredAlert.alert_id == models.Alert.id)
        .where(models.Alert.user_id == user_id)
        .order_by(models.TriggeredAlert.triggered_at.desc())
        .limit(limit)
    )
    return res.scalars().all()

# ── Market helpers ─────────────────────────────────────────────────────────────

async def _ltp(symbol: str) -> Optional[float]:
    try:
        _, key = await get_provider(symbol)
        if not key or "|" not in key:
            return None
        provider = UpstoxProvider()
        q = await provider.fetch_quote(key)
        p = q.get("price")
        return float(p) if p is not None else None
    except Exception:
        return None

async def _latest_rsi(symbol: str, period: int = 14) -> Optional[float]:
    try:
        key = get_instrument_key(symbol)
        provider = UpstoxProvider()
        candles = await provider.fetch_candles(key, resolution="D", limit=60)
        if len(candles) < period + 2:
            return None
        closes = [c["close"] for c in candles]
        rsi_vals = compute_rsi(closes, period)
        return rsi_vals[-1] if rsi_vals else None
    except Exception:
        return None

async def _latest_volume_ratio(symbol: str) -> Optional[float]:
    """current volume / 20-day avg volume."""
    try:
        key = get_instrument_key(symbol)
        provider = UpstoxProvider()
        candles = await provider.fetch_candles(key, resolution="D", limit=25)
        if len(candles) < 5:
            return None
        vols = [c["volume"] for c in candles]
        avg = sum(vols[:-1]) / len(vols[:-1])
        return vols[-1] / avg if avg else None
    except Exception:
        return None

# ── Check single alert ─────────────────────────────────────────────────────────

async def _check_alert(alert) -> Optional[dict]:
    """Returns trigger dict or None."""
    atype = alert.alert_type
    sym   = alert.symbol
    thr   = alert.threshold

    if atype == "price_above":
        price = await _ltp(sym)
        if price and price >= thr:
            return {"value": price, "msg": f"{sym} price ₹{price:.2f} crossed ABOVE ₹{thr:.2f}"}

    elif atype == "price_below":
        price = await _ltp(sym)
        if price and price <= thr:
            return {"value": price, "msg": f"{sym} price ₹{price:.2f} dropped BELOW ₹{thr:.2f}"}

    elif atype == "rsi_overbought":
        r = await _latest_rsi(sym)
        if r and r >= thr:
            return {"value": r, "msg": f"{sym} RSI {r:.1f} — OVERBOUGHT (threshold {thr})"}

    elif atype == "rsi_oversold":
        r = await _latest_rsi(sym)
        if r and r <= thr:
            return {"value": r, "msg": f"{sym} RSI {r:.1f} — OVERSOLD (threshold {thr})"}

    elif atype == "volume_spike":
        ratio = await _latest_volume_ratio(sym)
        if ratio and ratio >= thr:
            return {"value": ratio, "msg": f"{sym} volume spike {ratio:.1f}x above 20-day average"}

    return None

# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[AlertOut])
async def list_alerts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    return await get_alerts(db, user.id)


@router.post("/", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
async def create_alert_endpoint(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    if data.alert_type not in ALERT_TYPES:
        raise HTTPException(400, f"Invalid alert_type. Choose from: {ALERT_TYPES}")
    return await create_alert(db, user.id, data)


@router.put("/{alert_id}", response_model=AlertOut)
async def update_alert(
    alert_id: int,
    data: AlertUpdate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    alert = await get_alert_by_id(db, alert_id, user.id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    if data.is_active is not None:
        alert.is_active = data.is_active
    if data.threshold is not None:
        alert.threshold = data.threshold
    if data.note is not None:
        alert.note = data.note
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    alert = await get_alert_by_id(db, alert_id, user.id)
    if not alert:
        raise HTTPException(404, "Alert not found")
    await db.delete(alert)
    await db.commit()


@router.get("/check")
async def check_all_alerts(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Manually trigger alert evaluation for all active user alerts."""
    import asyncio
    alerts = await get_alerts(db, user.id)
    active = [a for a in alerts if a.is_active]

    results = []
    checks = await asyncio.gather(*[_check_alert(a) for a in active])

    for alert, result in zip(active, checks):
        if result:
            t = await record_trigger(db, alert, result["value"], result["msg"])
            results.append({
                "alert_id": alert.id,
                "symbol":   alert.symbol,
                "type":     alert.alert_type,
                "message":  result["msg"],
                "value":    result["value"],
                "triggered_at": t.triggered_at.isoformat(),
            })

    return {
        "checked": len(active),
        "triggered": len(results),
        "results": results,
        "checked_at": datetime.utcnow().isoformat(),
    }


@router.get("/triggered")
async def list_triggered(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Get the 50 most recently triggered alerts."""
    triggered = await get_triggered(db, user.id, limit)
    return [
        {
            "id":            t.id,
            "alert_id":      t.alert_id,
            "symbol":        t.symbol,
            "alert_type":    t.alert_type,
            "threshold":     t.threshold,
            "current_value": t.current_value,
            "message":       t.message,
            "triggered_at":  t.triggered_at.isoformat(),
        }
        for t in triggered
    ]