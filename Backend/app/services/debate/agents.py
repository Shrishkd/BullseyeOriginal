# app/services/debate/agents.py
"""
Bull, Bear and Moderator agents.

Every agent receives the same evidence pack and must cite evidence IDs for
each claim. Outputs are then checked: unknown IDs and numbers that don't
appear anywhere in the evidence are flagged so the UI can mark the claim.
"""

import re
from typing import List, Literal

from pydantic import BaseModel, Field

from app.services.llm_client import LLMClient
from app.services.debate.evidence import EvidencePack

Side = Literal["bull", "bear"]


# ── output schemas ─────────────────────────────────────────────────────────────

class Point(BaseModel):
    claim: str = Field(description="One argument, max ~35 words")
    evidence_ids: List[str] = Field(description="Evidence IDs supporting the claim, e.g. ['E2', 'E7']")


class Opening(BaseModel):
    thesis: str = Field(description="One-sentence thesis")
    points: List[Point] = Field(description="3 to 4 supporting points")


class RebuttalPoint(BaseModel):
    target: str = Field(description="Short paraphrase of the opponent claim being answered")
    claim: str = Field(description="The counter-argument, max ~35 words")
    evidence_ids: List[str]


class Rebuttal(BaseModel):
    responses: List[RebuttalPoint] = Field(description="Exactly 2 rebuttals of the opponent's strongest claims")
    concession: str = Field(description="One point the opponent got right, stated honestly")


class KeyRisk(BaseModel):
    risk: str
    evidence_ids: List[str]


class ModeratorNote(BaseModel):
    summary: str = Field(description="2-3 sentences on why the evidence produces this verdict")
    stronger_side: Literal["bull", "bear", "even"]
    stronger_side_reason: str = Field(description="One sentence: which side used the evidence better and why")
    key_risks: List[KeyRisk] = Field(description="2 to 3 risks that could make this verdict wrong")


# ── prompts ────────────────────────────────────────────────────────────────────

RULES = """
Rules:
- Use ONLY the facts in the EVIDENCE list. No outside knowledge, no other news.
- Every claim must cite at least one evidence ID (e.g. "E3") in evidence_ids.
- Do not state any number that is not in the evidence.
- Be specific and concise. Plain English an Indian retail investor understands.
- This is educational analysis, not financial advice. Never promise returns.
""".strip()

PERSONAS = {
    "bull": (
        "You are the BULL analyst in a structured stock debate on Bullseye. "
        "Make the strongest honest case FOR buying or holding the stock: upside "
        "probability, supportive technicals, positive sentiment, acceptable risk."
    ),
    "bear": (
        "You are the BEAR analyst in a structured stock debate on Bullseye. "
        "Make the strongest honest case AGAINST buying or holding the stock: "
        "downside probability, volatility, drawdown, VaR, weak technicals, "
        "negative sentiment, concentration risk."
    ),
}

MODERATOR = (
    "You are the MODERATOR of a Bull vs Bear stock debate on Bullseye. The verdict "
    "and confidence were computed by a fixed scoring formula and are FINAL — you "
    "cannot change them. Explain why the evidence produces this verdict, judge "
    "which debater used the evidence better (quality of reasoning, not which "
    "conclusion you prefer), and name the 2-3 risks most likely to make this "
    "verdict wrong."
)


def _evidence_block(pack: EvidencePack) -> str:
    return f"STOCK: {pack.symbol}\n\nEVIDENCE:\n{pack.as_prompt()}"


def _opening_text(o: Opening) -> str:
    pts = "\n".join(f"- {p.claim} {p.evidence_ids}" for p in o.points)
    return f"Thesis: {o.thesis}\n{pts}"


def _rebuttal_text(r: Rebuttal) -> str:
    pts = "\n".join(f"- Re \"{p.target}\": {p.claim} {p.evidence_ids}" for p in r.responses)
    return f"{pts}\nConcedes: {r.concession}"


# ── agent calls ────────────────────────────────────────────────────────────────

async def opening(llm: LLMClient, side: Side, pack: EvidencePack) -> Opening:
    return await llm.generate_json(
        system_prompt=f"{PERSONAS[side]}\n\n{RULES}",
        user_message=f"{_evidence_block(pack)}\n\nWrite your opening argument with 3-4 points.",
        schema=Opening,
    )


async def rebuttal(llm: LLMClient, side: Side, pack: EvidencePack,
                   own: Opening, opponent: Opening) -> Rebuttal:
    other = "BEAR" if side == "bull" else "BULL"
    return await llm.generate_json(
        system_prompt=f"{PERSONAS[side]}\n\n{RULES}",
        user_message=(
            f"{_evidence_block(pack)}\n\n"
            f"YOUR OPENING:\n{_opening_text(own)}\n\n"
            f"{other} OPENING:\n{_opening_text(opponent)}\n\n"
            f"Rebut the {other}'s two strongest claims using the evidence, "
            "and honestly concede one point they got right."
        ),
        schema=Rebuttal,
    )


async def moderate(llm: LLMClient, pack: EvidencePack, verdict: dict,
                   bull_open: Opening, bear_open: Opening,
                   bull_reb: Rebuttal, bear_reb: Rebuttal) -> ModeratorNote:
    breakdown = "\n".join(
        f"- {c['name']}: score {c['raw']:+.3f} × weight {c['weight']:+.2f} "
        f"= {c['contribution']:+.3f} ({c['explanation']})"
        for c in verdict["components"]
    )
    return await llm.generate_json(
        system_prompt=f"{MODERATOR}\n\n{RULES}",
        user_message=(
            f"{_evidence_block(pack)}\n\n"
            f"BULL OPENING:\n{_opening_text(bull_open)}\n\n"
            f"BEAR OPENING:\n{_opening_text(bear_open)}\n\n"
            f"BULL REBUTTAL:\n{_rebuttal_text(bull_reb)}\n\n"
            f"BEAR REBUTTAL:\n{_rebuttal_text(bear_reb)}\n\n"
            f"COMPUTED VERDICT: {verdict['verdict']} "
            f"(confidence {verdict['confidence']}%, composite {verdict['composite']:+.3f}; "
            f"BUY above {verdict['thresholds']['buy']}, SELL below {verdict['thresholds']['sell']})\n"
            f"SCORE BREAKDOWN:\n{breakdown}"
        ),
        schema=ModeratorNote,
        temperature=0.3,
    )


# ── grounding check ────────────────────────────────────────────────────────────

_NUM = re.compile(r"\d+(?:\.\d+)?")
# Conventional thresholds agents may mention without citing (RSI bands, 50/50 …)
_ALLOWED_CONSTANTS = {0.0, 1.0, 2.0, 3.0, 4.0, 20.0, 30.0, 50.0, 70.0, 100.0}


def _numbers(text: str) -> List[float]:
    text = re.sub(r"\bE\d+\b", "", text)          # evidence IDs aren't figures
    text = re.sub(r"(?<=\d),(?=\d)", "", text)   # 1,234.50 → 1234.50
    return [float(n) for n in _NUM.findall(text)]


def _evidence_numbers(pack: EvidencePack) -> List[float]:
    text = " ".join(f"{e.label} {e.value} {e.note}" for e in pack.items)
    return _numbers(text) + [float(pack.current_price or 0)]


def _matches(n: float, known: List[float]) -> bool:
    if n in _ALLOWED_CONSTANTS:
        return True
    # Allow rounding: 52.34 → "52.3" or "52"; 1742.5 → "1,743"
    return any(
        abs(n - k) < 0.051
        or (n.is_integer() and abs(n - k) < 0.5)
        or (k and abs(n - k) / abs(k) <= 0.01)
        for k in known
    )


def check_claim(claim: str, evidence_ids: List[str], pack: EvidencePack) -> dict:
    valid = pack.ids()
    known = _evidence_numbers(pack)
    ids = [i.strip().upper() for i in evidence_ids]
    good_ids = [i for i in ids if i in valid]
    bad_ids = [i for i in ids if i not in valid]
    unverified = [n for n in _numbers(claim) if not _matches(n, known)]
    return {
        "claim": claim,
        "evidence_ids": good_ids,
        "invalid_ids": bad_ids,
        "unverified_numbers": [f"{n:g}" for n in unverified],
        "verified": bool(good_ids) and not bad_ids and not unverified,
    }


def serialize_opening(o: Opening, pack: EvidencePack) -> dict:
    return {
        "thesis": o.thesis,
        "points": [check_claim(p.claim, p.evidence_ids, pack) for p in o.points],
    }


def serialize_rebuttal(r: Rebuttal, pack: EvidencePack) -> dict:
    return {
        "points": [
            {"target": p.target, **check_claim(p.claim, p.evidence_ids, pack)}
            for p in r.responses
        ],
        "concession": r.concession,
    }


def serialize_moderator(m: ModeratorNote, pack: EvidencePack) -> dict:
    return {
        "summary": m.summary,
        "stronger_side": m.stronger_side,
        "stronger_side_reason": m.stronger_side_reason,
        "key_risks": [
            {"risk": k.risk, **check_claim(k.risk, k.evidence_ids, pack)}
            for k in m.key_risks
        ],
    }
