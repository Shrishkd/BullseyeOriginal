# app/services/debate/evidence.py
"""
Evidence pack for the Bull/Bear debate.

Everything the agents are allowed to argue from is gathered here, without any
LLM, and each fact gets a stable ID (E1, E2, …) that arguments must cite.
`facts` carries the raw numbers the deterministic scorer uses.
"""

import asyncio
from dataclasses import dataclass, field, asdict
from datetime import date, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select

from app import models
from app.crud import portfolio as portfolio_crud
from app.db.session import AsyncSessionLocal
from app.services import risk_metrics as rm
from app.services.ml.prediction_service import get_prediction_service
from app.services.news_service import fetch_symbol_news

RISK_WINDOW_DAYS = 90
STRESS_MARKET_DROP = 0.10      # 10% market fall for the position stress test
SENTIMENT_HISTORY_DAYS = 7


@dataclass
class Evidence:
    id: str
    category: str       # model | technical | risk | sentiment | position
    label: str
    value: str
    note: str = ""

    def as_line(self) -> str:
        note = f" — {self.note}" if self.note else ""
        return f"[{self.id}] ({self.category}) {self.label}: {self.value}{note}"


@dataclass
class EvidencePack:
    symbol: str
    current_price: Optional[float]
    items: List[Evidence] = field(default_factory=list)
    facts: Dict[str, Any] = field(default_factory=dict)
    unavailable: List[str] = field(default_factory=list)

    def add(self, category: str, label: str, value: str, note: str = "") -> str:
        eid = f"E{len(self.items) + 1}"
        self.items.append(Evidence(eid, category, label, value, note))
        return eid

    def ids(self) -> set:
        return {e.id for e in self.items}

    def as_prompt(self) -> str:
        return "\n".join(e.as_line() for e in self.items)

    def as_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "current_price": self.current_price,
            "items": [asdict(e) for e in self.items],
            "unavailable": self.unavailable,
        }


# ── section builders ───────────────────────────────────────────────────────────

def _add_model(pack: EvidencePack, pred: dict) -> None:
    probs = pred["probabilities"]
    pack.add("model", "XGBoost forecast (next session, daily candles)",
             f"{pred['prediction']} with {pred['confidence']:.1f}% confidence")
    pack.add("model", "Probability of UP move", f"{probs['up']:.1f}%")
    pack.add("model", "Probability of DOWN move", f"{probs['down']:.1f}%")
    pack.add("model", "Probability of SIDEWAYS move", f"{probs['sideways']:.1f}%")
    pack.add("model", "Expected move (volatility × direction)", pred["expected_move"])

    pack.facts.update(
        p_up=probs["up"], p_down=probs["down"], p_side=probs["sideways"],
        model_confidence=pred["confidence"], model_label=pred["prediction"],
    )


def _add_technicals(pack: EvidencePack, pred: dict, closes: List[float]) -> None:
    ind = pred.get("indicators", {})

    rsi_val = ind.get("rsi")
    if rsi_val is not None:
        zone = "oversold" if rsi_val < 30 else "overbought" if rsi_val > 70 else "neutral zone"
        pack.add("technical", "RSI(14)", f"{rsi_val:.1f}", zone)
    pack.facts["rsi"] = rsi_val

    e9, e21 = ind.get("ema_9"), ind.get("ema_21")
    if e9 is not None and e21 is not None:
        bull = e9 > e21
        pack.add("technical", "9-EMA vs 21-EMA", f"{e9:.2f} vs {e21:.2f}",
                 "short-term trend above long-term (bullish)" if bull
                 else "short-term trend below long-term (bearish)")
        pack.facts["ema_bull"] = bull

    m, ms = ind.get("macd"), ind.get("macd_signal")
    if m is not None and ms is not None:
        bull = m > ms
        pack.add("technical", "MACD vs signal line", f"{m:.2f} vs {ms:.2f}",
                 "momentum bullish" if bull else "momentum bearish")
        pack.facts["macd_bull"] = bull

    for sig in pred.get("signals", []):
        if "volume" in sig.lower() or "trend" in sig.lower():
            pack.add("technical", "Model signal", sig)

    if len(closes) >= 31:
        chg = (closes[-1] - closes[-31]) / closes[-31] * 100
        pack.add("technical", "30-session price change", f"{chg:+.2f}%",
                 f"{closes[-31]:.2f} → {closes[-1]:.2f}")
        pack.facts["change_30d"] = chg


def _add_risk(pack: EvidencePack, closes: List[float], market_closes: List[float]) -> None:
    returns = rm.daily_returns(closes)
    if len(returns) < 10:
        pack.unavailable.append("risk")
        return

    vol    = rm.annualised_volatility(returns)
    dd     = rm.max_drawdown(closes)
    sharpe = rm.sharpe(returns)
    var95  = rm.var_95(returns)

    pack.add("risk", "Annualised volatility (90 sessions)", f"{vol:.1f}%",
             f"{rm.risk_level(vol)} risk")
    pack.add("risk", "Max drawdown (90 sessions)", f"{dd:.1f}%")
    pack.add("risk", "Sharpe ratio (annualised, 6.5% risk-free)", f"{sharpe:.2f}",
             "return did not beat risk-free rate" if sharpe < 0 else
             "weak risk-adjusted return" if sharpe < 1 else "healthy risk-adjusted return")
    pack.add("risk", "1-day Value-at-Risk (95%)", f"{var95:.2f}%",
             f"on 1 day in 20 the stock historically fell at least {var95:.2f}%")

    market_returns = rm.daily_returns(market_closes)
    beta = None
    if len(market_returns) >= 10:
        beta = rm.beta(returns, market_returns)
        pack.add("risk", "Beta vs Nifty 50 (via NIFTYBEES)", f"{beta:.2f}",
                 "moves more than the market" if beta > 1.1 else
                 "moves less than the market" if beta < 0.9 else "moves roughly with the market")

    pack.facts.update(volatility=vol, max_drawdown=dd, sharpe=sharpe, var_95=var95, beta=beta)


async def _sentiment_history(symbol: str, today_score: float, count: int) -> List[float]:
    """Store today's reading and return prior daily scores (oldest first)."""
    today = date.today()
    async with AsyncSessionLocal() as db:
        res = await db.execute(
            select(models.SentimentSnapshot).where(models.SentimentSnapshot.symbol == symbol)
            .where(models.SentimentSnapshot.day >= today - timedelta(days=SENTIMENT_HISTORY_DAYS))
            .order_by(models.SentimentSnapshot.day)
        )
        rows = list(res.scalars().all())

        existing = next((r for r in rows if r.day == today), None)
        if existing:
            existing.score, existing.article_count = today_score, count
        else:
            db.add(models.SentimentSnapshot(symbol=symbol, day=today,
                                            score=today_score, article_count=count))
        await db.commit()
    return [r.score for r in rows if r.day != today]


async def _add_sentiment(pack: EvidencePack, news: dict) -> None:
    n = news["total"]
    if n == 0:
        pack.unavailable.append("sentiment")
        pack.add("sentiment", "Company news coverage", "no recent articles found",
                 f"search: {news['query']}")
        pack.facts.update(sentiment=0.0, sentiment_n=0)
        return

    pack.add("sentiment", f"Average VADER news sentiment ({n} articles)",
             f"{news['score']:+.3f} ({news['label']})",
             f"{news['positive']} positive, {news['negative']} negative, {news['neutral']} neutral")

    if news["window_trend"] is not None:
        wt = news["window_trend"]
        pack.add("sentiment", "Headline tone, newer vs older half", f"{wt:+.3f}",
                 "improving" if wt > 0.05 else "deteriorating" if wt < -0.05 else "stable")

    history = await _sentiment_history(pack.symbol, news["score"], n)
    if history:
        prior = sum(history) / len(history)
        delta = news["score"] - prior
        pack.add("sentiment", f"Sentiment vs prior {len(history)}-day average",
                 f"{news['score']:+.3f} vs {prior:+.3f}",
                 "improving" if delta > 0.05 else "deteriorating" if delta < -0.05 else "stable")

    # The most opinionated headlines, so agents can quote real ones
    ranked = sorted(news["articles"], key=lambda a: abs(a["sentiment"]["score"]), reverse=True)
    for a in ranked[:3]:
        pack.add("sentiment", f"Headline ({a['source']})", f"\"{a['title']}\"",
                 f"VADER {a['sentiment']['score']:+.3f}")

    pack.facts.update(sentiment=news["score"], sentiment_n=n,
                      sentiment_trend=news["window_trend"])


def _add_position(pack: EvidencePack, holdings: list) -> None:
    mine = [h for h in holdings if h.symbol.upper() == pack.symbol]
    if not mine or not pack.current_price:
        return

    qty = sum(h.quantity for h in mine)
    cost = sum(h.buy_price * h.quantity for h in mine)
    avg_buy = cost / qty if qty else 0
    value = qty * pack.current_price
    pnl_pct = (value - cost) / cost * 100 if cost else 0

    total_invested = sum(h.buy_price * h.quantity for h in holdings)
    weight = cost / total_invested if total_invested else 0

    by_symbol: Dict[str, float] = {}
    for h in holdings:
        by_symbol[h.symbol.upper()] = by_symbol.get(h.symbol.upper(), 0) + h.buy_price * h.quantity
    hhi = rm.concentration_risk([v / total_invested for v in by_symbol.values()]) if total_invested else 0

    pack.add("position", "Your holding", f"{qty:g} shares @ avg {avg_buy:.2f}",
             f"unrealised P&L {pnl_pct:+.2f}%")
    pack.add("position", "Position weight in your portfolio (by cost)", f"{weight * 100:.1f}%",
             "concentrated (>25%)" if weight > 0.25 else "")
    pack.add("position", "Portfolio concentration (HHI)", f"{hhi:.3f}",
             "concentrated" if hhi > 0.25 else "diversified")

    beta = pack.facts.get("beta") or 1.0
    loss = value * beta * STRESS_MARKET_DROP
    pack.add("position", f"Stress test: market falls {STRESS_MARKET_DROP:.0%}",
             f"beta-implied loss ₹{loss:,.0f} on this position",
             f"{beta * STRESS_MARKET_DROP * 100:.1f}% of position value")

    pack.facts.update(holds_position=True, position_weight=weight, position_pnl=pnl_pct, hhi=hhi)


# ── entry point ────────────────────────────────────────────────────────────────

async def _holdings(user_id: int) -> list:
    async with AsyncSessionLocal() as db:
        return await portfolio_crud.get_holdings(db, user_id)


async def build_evidence(symbol: str, user_id: int) -> EvidencePack:
    """
    Gather prediction, risk, sentiment and position data concurrently.
    Only the prediction is mandatory; other sections degrade to `unavailable`.
    """
    symbol = symbol.upper()
    pred, closes, market_closes, news, holdings = await asyncio.gather(
        get_prediction_service().predict(symbol, model_type="xgboost"),
        rm.fetch_closes(symbol, RISK_WINDOW_DAYS),
        rm.fetch_closes(rm.MARKET_PROXY, RISK_WINDOW_DAYS),
        fetch_symbol_news(symbol),
        _holdings(user_id),
        return_exceptions=True,
    )
    if isinstance(pred, Exception):
        raise ValueError(f"Prediction model unavailable for {symbol}: {pred}")

    pack = EvidencePack(symbol=symbol, current_price=pred.get("current_price"))
    _add_model(pack, pred)
    _add_technicals(pack, pred, closes if isinstance(closes, list) else [])

    if isinstance(closes, Exception):
        pack.unavailable.append("risk")
    else:
        _add_risk(pack, closes, market_closes if isinstance(market_closes, list) else [])

    if isinstance(news, Exception):
        print(f"Debate: news unavailable for {symbol}: {news}")
        pack.unavailable.append("sentiment")
    else:
        await _add_sentiment(pack, news)

    if not isinstance(holdings, Exception):
        _add_position(pack, holdings)

    return pack
