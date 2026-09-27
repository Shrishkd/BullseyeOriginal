# app/services/debate/orchestrator.py
"""
Runs a debate as a stream of events:

  status → evidence → argument(bull/bear opening) → argument(bull/bear rebuttal)
         → verdict → done

Openings run in parallel, then rebuttals in parallel, then the moderator.
The verdict is always computed in code, so if an LLM round fails the user
still gets a verdict (with `moderator: null`) plus an `error` event.
"""

import asyncio
from datetime import date
from typing import AsyncIterator, Dict, List, Tuple

from app.services.llm_client import LLMClient
from app.services.debate import agents
from app.services.debate.evidence import build_evidence
from app.services.debate.scoring import compute_verdict

# (user_id, symbol, day) → finished event list. The model runs on daily candles,
# so a debate is reused for the rest of the trading day unless refreshed.
_cache: Dict[Tuple[int, str, date], List[dict]] = {}


def _cache_put(key: Tuple[int, str, date], events: List[dict]) -> None:
    for stale in [k for k in _cache if k[2] != key[2]]:
        del _cache[stale]
    _cache[key] = events


async def _run_pair(coros: Dict[str, "asyncio.Future"]) -> AsyncIterator[Tuple[str, object]]:
    """Run bull/bear coroutines concurrently, yielding (side, result|exception) as each finishes."""
    async def tagged(side, coro):
        try:
            return side, await coro
        except Exception as exc:
            return side, exc

    for fut in asyncio.as_completed([tagged(s, c) for s, c in coros.items()]):
        yield await fut


async def run_debate(symbol: str, user_id: int, refresh: bool = False) -> AsyncIterator[dict]:
    symbol = symbol.upper()
    key = (user_id, symbol, date.today())

    if not refresh and key in _cache:
        for event in _cache[key]:
            yield {**event, "cached": True} if event["type"] == "done" else event
        return

    events: List[dict] = []

    def emit(event: dict) -> dict:
        events.append(event)
        return event

    # ── 1. Evidence ───────────────────────────────────────────────────────────
    yield {"type": "status", "stage": "evidence",
           "message": "Gathering model, risk, sentiment and position evidence…"}
    try:
        pack = await build_evidence(symbol, user_id)
    except Exception as exc:
        yield {"type": "error", "stage": "evidence", "message": str(exc)}
        return
    yield emit({"type": "evidence", **pack.as_dict()})

    verdict = compute_verdict(pack.facts, pack.unavailable)

    def final_verdict(moderator=None) -> dict:
        return {"type": "verdict", **verdict, "moderator": moderator}

    try:
        llm = LLMClient()
    except Exception as exc:
        yield {"type": "error", "stage": "openings", "message": str(exc)}
        yield final_verdict()
        yield {"type": "done", "cached": False}
        return

    # ── 2. Openings ───────────────────────────────────────────────────────────
    yield {"type": "status", "stage": "openings", "message": "Bull and Bear are preparing openings…"}
    openings: Dict[str, agents.Opening] = {}
    async for side, result in _run_pair({
        "bull": agents.opening(llm, "bull", pack),
        "bear": agents.opening(llm, "bear", pack),
    }):
        if isinstance(result, Exception):
            yield {"type": "error", "stage": "openings", "side": side, "message": str(result)}
            continue
        openings[side] = result
        yield emit({"type": "argument", "side": side, "round": "opening",
                    **agents.serialize_opening(result, pack)})

    if len(openings) < 2:
        yield final_verdict()
        yield {"type": "done", "cached": False}
        return

    # ── 3. Rebuttals ──────────────────────────────────────────────────────────
    yield {"type": "status", "stage": "rebuttals", "message": "Each side is rebutting the other…"}
    rebuttals: Dict[str, agents.Rebuttal] = {}
    async for side, result in _run_pair({
        "bull": agents.rebuttal(llm, "bull", pack, openings["bull"], openings["bear"]),
        "bear": agents.rebuttal(llm, "bear", pack, openings["bear"], openings["bull"]),
    }):
        if isinstance(result, Exception):
            yield {"type": "error", "stage": "rebuttals", "side": side, "message": str(result)}
            continue
        rebuttals[side] = result
        yield emit({"type": "argument", "side": side, "round": "rebuttal",
                    **agents.serialize_rebuttal(result, pack)})

    if len(rebuttals) < 2:
        yield final_verdict()
        yield {"type": "done", "cached": False}
        return

    # ── 4. Moderator ──────────────────────────────────────────────────────────
    yield {"type": "status", "stage": "verdict", "message": "Moderator is weighing the debate…"}
    try:
        note = await agents.moderate(llm, pack, verdict,
                                     openings["bull"], openings["bear"],
                                     rebuttals["bull"], rebuttals["bear"])
    except Exception as exc:
        yield {"type": "error", "stage": "verdict", "message": str(exc)}
        yield final_verdict()
        yield {"type": "done", "cached": False}
        return

    yield emit(final_verdict(agents.serialize_moderator(note, pack)))
    yield emit({"type": "done", "cached": False})
    _cache_put(key, events)   # only complete debates are cached
