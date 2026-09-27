# app/services/debate/scoring.py
"""
Deterministic verdict for the debate.

The LLM never picks the verdict or the confidence — they come from this fixed,
inspectable formula over the evidence pack. The moderator only explains it.

    composite = 0.45·model + 0.25·technical + 0.15·sentiment − 0.15·risk

  model      P(up) − P(down)                                   −1 … 1
  technical  mean of EMA / MACD / RSI votes                    −1 … 1
  sentiment  VADER average, scaled and shrunk by article count −1 … 1
  risk       volatility, drawdown, VaR, concentration penalty   0 … 1
"""

from typing import Any, Dict, List

WEIGHTS = {"model": 0.45, "technical": 0.25, "sentiment": 0.15, "risk": -0.15}
BUY_THRESHOLD = 0.15
SELL_THRESHOLD = -0.15


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def _model_score(f: Dict[str, Any]) -> float:
    return (f["p_up"] - f["p_down"]) / 100


def _technical_score(f: Dict[str, Any]) -> float:
    votes: List[float] = []
    if f.get("ema_bull") is not None:
        votes.append(1.0 if f["ema_bull"] else -1.0)
    if f.get("macd_bull") is not None:
        votes.append(1.0 if f["macd_bull"] else -1.0)
    rsi = f.get("rsi")
    if rsi is not None:
        # Oversold leans bullish (mean reversion), overbought leans bearish
        votes.append(1.0 if rsi < 30 else -1.0 if rsi > 70 else 0.0)
    return sum(votes) / len(votes) if votes else 0.0


def _sentiment_score(f: Dict[str, Any]) -> float:
    n = f.get("sentiment_n", 0)
    if not n:
        return 0.0
    # Headline VADER averages rarely exceed ±0.5; few articles → less weight
    return _clamp(f["sentiment"] / 0.5, -1.0, 1.0) * (n / (n + 5))


def _risk_score(f: Dict[str, Any]) -> float:
    if f.get("volatility") is None:
        return 0.0
    penalty = (
        0.5 * _clamp((f["volatility"] - 15) / 35)
        + 0.3 * _clamp((f["max_drawdown"] - 5) / 30)
        + 0.2 * _clamp((f["var_95"] - 1.5) / 3.5)
    )
    if f.get("position_weight", 0) > 0.25:
        penalty += 0.2
    return _clamp(penalty)


def compute_verdict(facts: Dict[str, Any], unavailable: List[str]) -> Dict[str, Any]:
    raw = {
        "model": _model_score(facts),
        "technical": _technical_score(facts),
        "sentiment": _sentiment_score(facts),
        "risk": _risk_score(facts),
    }
    contributions = {k: raw[k] * WEIGHTS[k] for k in raw}
    composite = sum(contributions.values())

    if composite > BUY_THRESHOLD:
        verdict = "BUY"
    elif composite < SELL_THRESHOLD:
        verdict = "SELL"
    else:
        verdict = "HOLD"

    # Confidence = how strong the score is + how much the directional inputs agree
    directional = [raw["model"], raw["technical"], raw["sentiment"]]
    if verdict == "HOLD":
        closeness = 1 - abs(composite) / BUY_THRESHOLD
        confidence = 35 + 30 * closeness + 20 * (facts["p_side"] / 100)
    else:
        sign = 1 if verdict == "BUY" else -1
        voters = [x for x in directional if abs(x) > 0.05]
        agreement = sum(1 for x in voters if x * sign > 0) / len(voters) if voters else 0
        strength = min(1.0, abs(composite) / 0.5)
        confidence = 35 + 40 * strength + 20 * agreement
    confidence -= 5 * len(set(unavailable))
    confidence = int(round(_clamp(confidence, 5, 95)))

    explanations = {
        "model": f"P(up) {facts['p_up']:.1f}% − P(down) {facts['p_down']:.1f}%",
        "technical": "EMA / MACD / RSI votes",
        "sentiment": (f"VADER {facts['sentiment']:+.3f} over {facts['sentiment_n']} articles"
                      if facts.get("sentiment_n") else "no news coverage"),
        "risk": "volatility, drawdown, VaR" + (", concentrated position"
                                              if facts.get("position_weight", 0) > 0.25 else ""),
    }

    return {
        "verdict": verdict,
        "confidence": confidence,
        "composite": round(composite, 3),
        "thresholds": {"buy": BUY_THRESHOLD, "sell": SELL_THRESHOLD},
        "components": [
            {
                "name": k,
                "raw": round(raw[k], 3),
                "weight": WEIGHTS[k],
                "contribution": round(contributions[k], 3),
                "explanation": explanations[k],
            }
            for k in raw
        ],
    }
