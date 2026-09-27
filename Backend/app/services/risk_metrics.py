# app/services/risk_metrics.py
"""
Pure risk-metric helpers shared by the Risk API and the Debate agents.
"""

import math
from typing import Dict, List

from app.services.market_providers.upstox import UpstoxProvider
from app.services.symbol_resolver import get_instrument_key

# NIFTY index isn't in the NSE_EQ instrument map — the Nifty BeES ETF tracks it.
MARKET_PROXY = "NIFTYBEES"

SECTOR_MAP: Dict[str, str] = {}

BANKING  = {"HDFCBANK","ICICIBANK","SBIN","AXISBANK","KOTAKBANK","BANDHANBNK","INDUSINDBK","FEDERALBNK"}
TECH     = {"TCS","INFY","WIPRO","HCLTECH","TECHM","LTIM","COFORGE","MPHASIS"}
ENERGY   = {"RELIANCE","ONGC","BPCL","IOC","GAIL","NTPC","POWERGRID","TATAPOWER"}
PHARMA   = {"SUNPHARMA","DRREDDY","CIPLA","DIVISLAB","APOLLOHOSP","LUPIN"}
FMCG     = {"HINDUNILVR","ITC","NESTLEIND","BRITANNIA","DABUR","MARICO"}
AUTO     = {"MARUTI","TATAMOTORS","BAJAJ-AUTO","HEROMOTOCO","EICHERMOT","M&M"}
METAL    = {"TATASTEEL","HINDALCO","JSWSTEEL","SAIL","VEDL","COALINDIA"}

def sector_for(symbol: str, asset_type: str) -> str:
    s = symbol.upper()
    if asset_type == "crypto":        return "Crypto"
    if s in BANKING:                  return "Banking"
    if s in TECH:                     return "Technology"
    if s in ENERGY:                   return "Energy"
    if s in PHARMA:                   return "Pharma"
    if s in FMCG:                     return "FMCG"
    if s in AUTO:                     return "Auto"
    if s in METAL:                    return "Metals"
    if asset_type in ("etf","mutual_fund"): return "ETF/Funds"
    return "Others"


async def fetch_closes(symbol: str, days: int = 60) -> List[float]:
    """Fetch daily closing prices for a symbol."""
    try:
        key = get_instrument_key(symbol)
        provider = UpstoxProvider()
        candles = await provider.fetch_candles(
            instrument_key=key, resolution="D", limit=days
        )
        if not candles:
            return []
        return [c["close"] for c in candles]
    except Exception:
        return []


def daily_returns(closes: List[float]) -> List[float]:
    if len(closes) < 2:
        return []
    return [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]


def annualised_volatility(returns: List[float]) -> float:
    if len(returns) < 2:
        return 0.0
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    return math.sqrt(variance) * math.sqrt(252) * 100   # % annualised


def max_drawdown(closes: List[float]) -> float:
    if not closes:
        return 0.0
    peak = closes[0]
    max_dd = 0.0
    for c in closes:
        if c > peak:
            peak = c
        dd = (peak - c) / peak
        if dd > max_dd:
            max_dd = dd
    return max_dd * 100   # %


def sharpe(returns: List[float], risk_free: float = 0.065 / 252) -> float:
    """Daily Sharpe ratio annualised."""
    if len(returns) < 2:
        return 0.0
    mean = sum(returns) / len(returns)
    variance = sum((r - mean) ** 2 for r in returns) / (len(returns) - 1)
    std = math.sqrt(variance)
    if std == 0:
        return 0.0
    return ((mean - risk_free) / std) * math.sqrt(252)


def var_95(returns: List[float]) -> float:
    """Historical VaR at 95% confidence (in %)."""
    if not returns:
        return 0.0
    sorted_r = sorted(returns)
    idx = max(0, int(len(sorted_r) * 0.05) - 1)
    return abs(sorted_r[idx]) * 100


def beta(stock_returns: List[float], market_returns: List[float]) -> float:
    """OLS beta vs market."""
    n = min(len(stock_returns), len(market_returns))
    if n < 5:
        return 1.0
    s = stock_returns[-n:]
    m = market_returns[-n:]
    mean_s = sum(s) / n
    mean_m = sum(m) / n
    cov = sum((s[i] - mean_s) * (m[i] - mean_m) for i in range(n)) / (n - 1)
    var_m = sum((x - mean_m) ** 2 for x in m) / (n - 1)
    return cov / var_m if var_m != 0 else 1.0


def risk_level(vol: float) -> str:
    if vol < 15:   return "Low"
    if vol < 25:   return "Moderate"
    if vol < 40:   return "High"
    return "Very High"


def concentration_risk(weights: List[float]) -> float:
    """Herfindahl-Hirschman Index (0-1). >0.25 = concentrated."""
    return sum(w ** 2 for w in weights)
