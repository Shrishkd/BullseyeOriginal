# Backend/app/api/v1/risk.py
"""
Risk Analysis API — Portfolio safety intelligence system.

Endpoints:
  GET  /risk/analysis          — Full portfolio risk report
  GET  /risk/volatility/{sym}  — Single symbol volatility metrics
  GET  /risk/correlation       — Inter-holding correlation matrix
  POST /risk/scenario          — What-if scenario analysis
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.crud import portfolio as portfolio_crud
from app.services.market_providers.router import get_provider
from app.services.indicators import rsi, ema, sma, macd
from app.services.llm_client import LLMClient

router = APIRouter(prefix="/risk", tags=["risk"])

# ── helpers ────────────────────────────────────────────────────────────────────

from app.services.risk_metrics import (  # noqa: E402
    SECTOR_MAP,
    sector_for,
    fetch_closes as _fetch_closes,
    daily_returns as _daily_returns,
    annualised_volatility as _annualised_volatility,
    max_drawdown as _max_drawdown,
    sharpe as _sharpe,
    var_95 as _var_95,
    beta as _beta,
    risk_level as _risk_level,
    concentration_risk as _concentration_risk,
)


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/analysis")
async def portfolio_risk_analysis(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Full portfolio risk report.
    Returns: per-holding metrics, portfolio-level stats, sector concentration,
    VaR, Sharpe, Beta, drawdown, and an AI risk summary.
    """
    holdings = await portfolio_crud.get_holdings(db, user.id)
    if not holdings:
        return {"error": "No holdings found. Add holdings to get risk analysis."}

    # ── 1. Fetch closes for each symbol (and NIFTY as market proxy) ────────────
    symbols = list({h.symbol for h in holdings})
    tasks   = [_fetch_closes(s, 90) for s in symbols]
    market_task = _fetch_closes("NIFTY", 90)   # fallback: RELIANCE if NIFTY fails

    all_closes_list = await asyncio.gather(*tasks, market_task)
    closes_map: Dict[str, List[float]] = dict(zip(symbols, all_closes_list[:-1]))
    market_closes = all_closes_list[-1]
    if not market_closes:
        # Use RELIANCE as a proxy
        market_closes = await _fetch_closes("RELIANCE", 90)
    market_returns = _daily_returns(market_closes)

    # ── 2. Portfolio weights ───────────────────────────────────────────────────
    total_invested = sum(h.buy_price * h.quantity for h in holdings)

    per_holding = []
    for h in holdings:
        closes = closes_map.get(h.symbol, [])
        returns = _daily_returns(closes)
        vol   = _annualised_volatility(returns)
        dd    = _max_drawdown(closes)
        sharpe = _sharpe(returns)
        var95  = _var_95(returns)
        beta   = _beta(returns, market_returns) if market_returns else 1.0
        weight = (h.buy_price * h.quantity) / total_invested if total_invested else 0
        current_price = closes[-1] if closes else h.buy_price
        pnl_pct = (current_price - h.buy_price) / h.buy_price * 100 if h.buy_price else 0

        latest_rsi: Optional[float] = None
        if len(closes) >= 15:
            rsi_vals = rsi(closes, 14)
            latest_rsi = rsi_vals[-1] if rsi_vals else None

        per_holding.append({
            "symbol":        h.symbol,
            "asset_type":    h.asset_type,
            "sector":        sector_for(h.symbol, h.asset_type),
            "weight_pct":    round(weight * 100, 2),
            "volatility":    round(vol, 2),
            "risk_level":    _risk_level(vol),
            "max_drawdown":  round(dd, 2),
            "sharpe_ratio":  round(sharpe, 3),
            "var_95":        round(var95, 2),
            "beta":          round(beta, 3),
            "rsi":           round(latest_rsi, 1) if latest_rsi is not None else None,
            "pnl_pct":       round(pnl_pct, 2),
            "data_points":   len(closes),
        })

    # ── 3. Portfolio-level metrics ─────────────────────────────────────────────
    weights = [p["weight_pct"] / 100 for p in per_holding]

    # Weighted portfolio volatility (simplified, ignoring correlation)
    port_vol = sum(w * p["volatility"] for w, p in zip(weights, per_holding))
    port_beta = sum(w * p["beta"] for w, p in zip(weights, per_holding))
    port_sharpe = sum(w * p["sharpe_ratio"] for w, p in zip(weights, per_holding))
    port_var95 = sum(w * p["var_95"] for w, p in zip(weights, per_holding))

    hhi = _concentration_risk(weights)

    # Sector breakdown
    sector_weights: Dict[str, float] = {}
    for p in per_holding:
        sector_weights[p["sector"]] = sector_weights.get(p["sector"], 0) + p["weight_pct"]

    # Top risk flags
    risk_flags = []
    if hhi > 0.25:
        top = max(per_holding, key=lambda x: x["weight_pct"])
        risk_flags.append(f"Concentration risk: {top['symbol']} is {top['weight_pct']:.1f}% of portfolio")
    if len(sector_weights) < 3:
        risk_flags.append("Low diversification: portfolio spans fewer than 3 sectors")
    for p in per_holding:
        if p["volatility"] > 40:
            risk_flags.append(f"{p['symbol']} has very high volatility ({p['volatility']:.1f}%)")
        if p["rsi"] and p["rsi"] > 75:
            risk_flags.append(f"{p['symbol']} RSI overbought ({p['rsi']:.0f}) — potential reversal risk")
        if p["rsi"] and p["rsi"] < 25:
            risk_flags.append(f"{p['symbol']} RSI oversold ({p['rsi']:.0f}) — watch for bounce")
        if p["max_drawdown"] > 30:
            risk_flags.append(f"{p['symbol']} had {p['max_drawdown']:.1f}% max drawdown in 90 days")

    overall_risk = _risk_level(port_vol)

    # ── 4. AI risk summary ─────────────────────────────────────────────────────
    lines = [f"- {p['symbol']} ({p['sector']}): weight {p['weight_pct']}%, vol {p['volatility']}%, beta {p['beta']}, RSI {p['rsi']}, drawdown {p['max_drawdown']}%" for p in per_holding]
    portfolio_text = "\n".join(lines)

    ai_summary = "AI risk summary unavailable."
    try:
        llm = LLMClient()
        ai_summary = llm.chat(
            system_prompt=(
                "You are Bullseye, an expert risk analyst for Indian equity markets. "
                "Analyse the portfolio risk profile below. Be specific, concise (~200 words). "
                "Structure response as: Risk Overview | Key Risks | Recommendations. "
                "Never guarantee returns."
            ),
            user_message=(
                f"Portfolio Risk Data:\n{portfolio_text}\n\n"
                f"Overall Portfolio Volatility: {port_vol:.1f}%\n"
                f"Portfolio Beta: {port_beta:.2f}\n"
                f"Concentration (HHI): {hhi:.3f}\n"
                f"Risk Flags: {'; '.join(risk_flags) if risk_flags else 'None'}\n\n"
                "Give a plain-English risk assessment."
            ),
        )
    except Exception:
        pass

    return {
        "overall_risk_level":    overall_risk,
        "portfolio_volatility":  round(port_vol, 2),
        "portfolio_beta":        round(port_beta, 3),
        "portfolio_sharpe":      round(port_sharpe, 3),
        "portfolio_var_95":      round(port_var95, 2),
        "hhi_concentration":     round(hhi, 4),
        "diversification_score": round(max(0, (1 - hhi) * 100), 1),
        "holdings_count":        len(holdings),
        "sectors_count":         len(sector_weights),
        "sector_weights":        sector_weights,
        "risk_flags":            risk_flags,
        "holdings":              per_holding,
        "ai_summary":            ai_summary,
        "last_updated":          datetime.utcnow().isoformat(),
    }


@router.get("/volatility/{symbol}")
async def symbol_volatility(
    symbol: str,
    user=Depends(get_current_user),
):
    """Get volatility metrics for a single symbol."""
    closes = await _fetch_closes(symbol.upper(), 90)
    if len(closes) < 5:
        return {"error": f"Insufficient data for {symbol}"}

    returns = _daily_returns(closes)
    vol     = _annualised_volatility(returns)
    dd      = _max_drawdown(closes)
    sharpe  = _sharpe(returns)
    var95   = _var_95(returns)

    rsi_vals = rsi(closes, 14) if len(closes) >= 15 else []
    ema_9    = ema(closes, 9)
    ema_21   = ema(closes, 21)

    return {
        "symbol":           symbol.upper(),
        "volatility":       round(vol, 2),
        "risk_level":       _risk_level(vol),
        "max_drawdown":     round(dd, 2),
        "sharpe_ratio":     round(sharpe, 3),
        "var_95":           round(var95, 2),
        "current_price":    closes[-1],
        "price_30d_ago":    closes[-31] if len(closes) >= 31 else closes[0],
        "rsi":              round(rsi_vals[-1], 1) if rsi_vals else None,
        "ema_9":            round(ema_9[-1], 2) if ema_9 else None,
        "ema_21":           round(ema_21[-1], 2) if ema_21 else None,
        "ema_trend":        "bullish" if ema_9 and ema_21 and ema_9[-1] > ema_21[-1] else "bearish",
        "data_points":      len(closes),
    }


@router.post("/scenario")
async def scenario_analysis(
    payload: dict,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    What-if scenario analysis.
    payload: { "market_drop_pct": 10 }  — simulate a market-wide drop
    """
    drop_pct = float(payload.get("market_drop_pct", 10)) / 100
    holdings = await portfolio_crud.get_holdings(db, user.id)
    if not holdings:
        return {"error": "No holdings"}

    symbols   = list({h.symbol for h in holdings})
    closes_list = await asyncio.gather(*[_fetch_closes(s, 90) for s in symbols])
    closes_map  = dict(zip(symbols, closes_list))

    market_closes = await _fetch_closes("RELIANCE", 90)
    market_returns = _daily_returns(market_closes)

    total_invested = sum(h.buy_price * h.quantity for h in holdings)
    total_current  = 0.0
    scenarios      = []

    for h in holdings:
        closes  = closes_map.get(h.symbol, [])
        returns = _daily_returns(closes)
        beta    = _beta(returns, market_returns) if market_returns and returns else 1.0
        current = closes[-1] if closes else h.buy_price
        total_current += current * h.quantity

        # Expected drop = beta * market_drop
        expected_drop = beta * drop_pct
        stressed_price = current * (1 - expected_drop)
        impact = (stressed_price - h.buy_price) * h.quantity

        scenarios.append({
            "symbol":          h.symbol,
            "beta":            round(beta, 3),
            "current_price":   round(current, 2),
            "stressed_price":  round(stressed_price, 2),
            "expected_drop":   round(expected_drop * 100, 2),
            "pnl_impact":      round(impact, 2),
        })

    stressed_total = sum(
        s["stressed_price"] * h.quantity
        for s, h in zip(scenarios, holdings)
    )
    portfolio_impact = stressed_total - total_current

    return {
        "market_drop_pct":    round(drop_pct * 100, 1),
        "current_value":      round(total_current, 2),
        "stressed_value":     round(stressed_total, 2),
        "portfolio_impact":   round(portfolio_impact, 2),
        "impact_pct":         round(portfolio_impact / total_current * 100, 2) if total_current else 0,
        "holdings":           scenarios,
    }