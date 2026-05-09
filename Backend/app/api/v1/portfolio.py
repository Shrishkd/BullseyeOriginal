# Backend/app/api/v1/portfolio.py

"""
Portfolio API — CRUD + CSV/Excel Import + AI Insights + Live Price enrichment.

Endpoints:
  GET    /portfolio/holdings          — list all holdings (with live prices)
  POST   /portfolio/holdings          — add one holding manually
  DELETE /portfolio/holdings/{id}     — remove a holding
  GET    /portfolio/summary           — aggregate P/L summary
  POST   /portfolio/import            — upload CSV / XLSX / XLS
  GET    /portfolio/ai-insights       — Gemini portfolio analysis
"""

import io
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.crud import portfolio as portfolio_crud
from app.schemas import (
    HoldingCreate,
    HoldingOut,
    HoldingWithStats,
    PortfolioSummary,
    CSVImportResult,
)
from app.services.market_providers.router import get_provider
from app.services.llm_client import LLMClient

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

CRYPTO_PATTERNS = re.compile(
    r"BTC|ETH|USDT|BNB|ADA|SOL|DOT|DOGE|XRP|LTC|AVAX|MATIC|LINK",
    re.IGNORECASE,
)
MUTUAL_FUND_PATTERNS = re.compile(r"MF|FUND|NIFTY50|SENSEX", re.IGNORECASE)
ETF_PATTERNS = re.compile(r"ETF|BEES|GOLDBEES|JUNIORBEES", re.IGNORECASE)


def _detect_asset_type(symbol: str) -> str:
    s = symbol.upper()
    if CRYPTO_PATTERNS.search(s):
        return "crypto"
    if ETF_PATTERNS.search(s):
        return "etf"
    if MUTUAL_FUND_PATTERNS.search(s):
        return "mutual_fund"
    return "stock"


def _parse_date(raw: Any) -> datetime:
    """Parse various date formats from CSV."""
    if isinstance(raw, datetime):
        return raw
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(raw).strip(), fmt)
        except ValueError:
            continue
    raise ValueError(f"Unrecognised date format: {raw!r}")


async def _fetch_price(symbol: str) -> Optional[float]:
    """Fetch live LTP; returns None on any error."""
    try:
        provider, instrument_key = await get_provider(symbol)
        if not instrument_key or "|" not in instrument_key:
            return None
        quote = await provider.fetch_quote(instrument_key)
        price = quote.get("price")
        return float(price) if price is not None else None
    except Exception:
        return None


def _sector_for(symbol: str, asset_type: str) -> str:
    """Very lightweight sector mapping — extend as needed."""
    s = symbol.upper()
    banking = {"HDFCBANK", "ICICIBANK", "SBIN", "AXISBANK", "KOTAKBANK", "BANDHANBNK", "FEDERALBNK", "INDUSINDBK"}
    tech = {"TCS", "INFY", "WIPRO", "HCLTECH", "TECHM", "LTIM", "COFORGE", "MPHASIS"}
    energy = {"RELIANCE", "ONGC", "BPCL", "IOC", "GAIL", "NTPC", "POWERGRID", "TATAPOWER"}
    pharma = {"SUNPHARMA", "DRREDDY", "CIPLA", "DIVISLAB", "APOLLOHOSP", "LUPIN"}

    if asset_type == "crypto":
        return "Crypto"
    if s in banking:
        return "Banking"
    if s in tech:
        return "Technology"
    if s in energy:
        return "Energy"
    if s in pharma:
        return "Pharma"
    if asset_type in ("etf", "mutual_fund"):
        return "ETF / Funds"
    return "Others"


# ──────────────────────────────────────────────────────────────────────────────
# Endpoints
# ──────────────────────────────────────────────────────────────────────────────


@router.get("/holdings", response_model=List[HoldingWithStats])
async def list_holdings(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Return all holdings enriched with live prices and P/L."""
    holdings = await portfolio_crud.get_holdings(db, user.id)
    if not holdings:
        return []

    # Fetch live prices concurrently (best-effort)
    import asyncio

    symbols = list({h.symbol for h in holdings})
    prices_list = await asyncio.gather(*[_fetch_price(s) for s in symbols])
    price_map: Dict[str, Optional[float]] = dict(zip(symbols, prices_list))

    total_current = sum(
        (price_map.get(h.symbol) or h.buy_price) * h.quantity for h in holdings
    )

    result: List[HoldingWithStats] = []
    for h in holdings:
        invested = h.buy_price * h.quantity
        current_price = price_map.get(h.symbol)
        current_value = (current_price * h.quantity) if current_price else None
        pnl = (current_value - invested) if current_value is not None else None
        pnl_pct = (pnl / invested * 100) if pnl is not None and invested else None
        alloc = ((current_value or invested) / total_current * 100) if total_current else None

        result.append(
            HoldingWithStats(
                id=h.id,
                symbol=h.symbol,
                quantity=h.quantity,
                buy_price=h.buy_price,
                buy_date=h.buy_date,
                asset_type=h.asset_type,
                created_at=h.created_at,
                current_price=current_price,
                current_value=current_value,
                invested_value=invested,
                pnl=pnl,
                pnl_pct=pnl_pct,
                allocation_pct=alloc,
            )
        )
    return result


@router.post("/holdings", response_model=HoldingOut, status_code=status.HTTP_201_CREATED)
async def add_holding(
    data: HoldingCreate,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Manually add a portfolio holding."""
    holding = await portfolio_crud.create_holding(db, user.id, data)
    return holding


@router.delete("/holdings/{holding_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_holding(
    holding_id: int,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Delete a holding by ID."""
    deleted = await portfolio_crud.delete_holding(db, holding_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Holding not found")


@router.get("/summary", response_model=PortfolioSummary)
async def portfolio_summary(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Aggregate portfolio summary."""
    holdings = await portfolio_crud.get_holdings(db, user.id)
    if not holdings:
        return PortfolioSummary(
            total_invested=0,
            total_current_value=None,
            total_pnl=None,
            total_pnl_pct=None,
            holdings_count=0,
            last_updated=datetime.utcnow(),
        )

    import asyncio

    symbols = list({h.symbol for h in holdings})
    prices_list = await asyncio.gather(*[_fetch_price(s) for s in symbols])
    price_map = dict(zip(symbols, prices_list))

    total_invested = sum(h.buy_price * h.quantity for h in holdings)
    total_current = 0.0
    has_any_price = False
    for h in holdings:
        p = price_map.get(h.symbol)
        if p is not None:
            has_any_price = True
            total_current += p * h.quantity
        else:
            total_current += h.buy_price * h.quantity

    total_pnl = (total_current - total_invested) if has_any_price else None
    total_pnl_pct = (total_pnl / total_invested * 100) if total_pnl is not None and total_invested else None

    return PortfolioSummary(
        total_invested=round(total_invested, 2),
        total_current_value=round(total_current, 2) if has_any_price else None,
        total_pnl=round(total_pnl, 2) if total_pnl is not None else None,
        total_pnl_pct=round(total_pnl_pct, 2) if total_pnl_pct is not None else None,
        holdings_count=len(holdings),
        last_updated=datetime.utcnow(),
    )


@router.post("/import", response_model=CSVImportResult)
async def import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Import portfolio from CSV / XLSX / XLS.

    Expected columns (case-insensitive):
        SYMBOL, QUANTITY, BUY_PRICE, BUY_DATE
    Optional column: ASSET_TYPE
    """
    filename = (file.filename or "").lower()

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Cannot read file: {exc}")

    # ── Parse file ──────────────────────────────────────────────────────────
    try:
        import pandas as pd  # lazy import — not always installed

        if filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(content))
        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Upload .csv, .xlsx, or .xls",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {exc}")

    # ── Normalise column names ──────────────────────────────────────────────
    df.columns = [str(c).strip().upper().replace(" ", "_") for c in df.columns]

    required = {"SYMBOL", "QUANTITY", "BUY_PRICE", "BUY_DATE"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing required columns: {', '.join(missing)}. "
                   f"Found: {', '.join(df.columns)}",
        )

    # ── Process rows ────────────────────────────────────────────────────────
    imported_holdings: List[HoldingCreate] = []
    errors: List[dict] = []

    seen_symbols: set = set()

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # +2 for header + 1-based

        symbol = str(row.get("SYMBOL", "")).strip().upper()
        if not symbol:
            errors.append({"row": row_num, "error": "Symbol is empty"})
            continue

        # Duplicate within this upload
        if symbol in seen_symbols:
            errors.append({"row": row_num, "symbol": symbol, "error": "Duplicate symbol in file (skipped)"})
            continue
        seen_symbols.add(symbol)

        try:
            quantity = float(row["QUANTITY"])
            if quantity <= 0:
                raise ValueError("Quantity must be > 0")
        except (ValueError, TypeError) as exc:
            errors.append({"row": row_num, "symbol": symbol, "error": f"Invalid quantity: {exc}"})
            continue

        try:
            buy_price = float(row["BUY_PRICE"])
            if buy_price <= 0:
                raise ValueError("Buy price must be > 0")
        except (ValueError, TypeError) as exc:
            errors.append({"row": row_num, "symbol": symbol, "error": f"Invalid buy_price: {exc}"})
            continue

        try:
            buy_date = _parse_date(row["BUY_DATE"])
        except ValueError as exc:
            errors.append({"row": row_num, "symbol": symbol, "error": str(exc)})
            continue

        asset_type_raw = str(row.get("ASSET_TYPE", "")).strip().lower()
        asset_type = asset_type_raw if asset_type_raw in ("stock", "etf", "crypto", "mutual_fund") \
            else _detect_asset_type(symbol)

        imported_holdings.append(
            HoldingCreate(
                symbol=symbol,
                quantity=quantity,
                buy_price=buy_price,
                buy_date=buy_date,
                asset_type=asset_type,
            )
        )

    # ── Persist valid rows ──────────────────────────────────────────────────
    if imported_holdings:
        await portfolio_crud.bulk_create_holdings(db, user.id, imported_holdings)

    return CSVImportResult(
        imported=len(imported_holdings),
        failed=len(errors),
        errors=errors,
    )


@router.get("/ai-insights")
async def ai_portfolio_insights(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Generate Gemini AI analysis of the user's portfolio."""
    holdings = await portfolio_crud.get_holdings(db, user.id)
    if not holdings:
        return {"insights": "Your portfolio is empty. Add some holdings to get AI-powered analysis."}

    import asyncio

    symbols = list({h.symbol for h in holdings})
    prices_list = await asyncio.gather(*[_fetch_price(s) for s in symbols])
    price_map = dict(zip(symbols, prices_list))

    total_invested = sum(h.buy_price * h.quantity for h in holdings)

    # Build a text summary for the LLM
    lines = []
    for h in holdings:
        current_price = price_map.get(h.symbol)
        invested = h.buy_price * h.quantity
        if current_price:
            current_val = current_price * h.quantity
            pnl = current_val - invested
            pnl_pct = pnl / invested * 100 if invested else 0
            lines.append(
                f"- {h.symbol} ({h.asset_type}): {h.quantity} units @ ₹{h.buy_price:.2f} | "
                f"Current ₹{current_price:.2f} | P/L: ₹{pnl:+.2f} ({pnl_pct:+.1f}%)"
            )
        else:
            alloc = invested / total_invested * 100 if total_invested else 0
            lines.append(
                f"- {h.symbol} ({h.asset_type}): {h.quantity} units @ ₹{h.buy_price:.2f} | "
                f"Allocation: {alloc:.1f}% (live price unavailable)"
            )

    portfolio_text = "\n".join(lines)

    system_prompt = (
        "You are Bullseye, an expert AI investment advisor for Indian markets. "
        "Analyse the user's portfolio and provide plain-English insights. "
        "Be specific, actionable, and educational. Never guarantee returns. "
        "Limit response to ~300 words, use sections: Overview, Top Winners/Losers, "
        "Concentration Risk, Recommendations."
    )

    user_message = f"""
Here is my current portfolio:

{portfolio_text}

Total invested: ₹{total_invested:,.2f}

Please analyse my portfolio and give me actionable insights.
"""

    try:
        llm = LLMClient()
        insights = llm.chat(system_prompt=system_prompt, user_message=user_message)
    except Exception as exc:
        insights = f"AI analysis unavailable: {exc}"

    return {"insights": insights}