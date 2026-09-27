# Backend/app/api/v1/debate.py
"""
AI Debate — Bull vs Bear agents argue over a stock, a moderator explains
a verdict computed from the evidence.

  GET /debate/{symbol}   — Server-Sent Events stream of the debate
"""

import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.api.deps import get_current_user
from app.services.instrument_registry import resolve_symbol
from app.services.debate.orchestrator import run_debate

router = APIRouter(prefix="/debate", tags=["AI Debate"])


@router.get("/{symbol}")
async def debate_stream(
    symbol: str,
    refresh: bool = Query(False, description="Ignore today's cached debate"),
    user=Depends(get_current_user),
):
    """
    Stream a debate as SSE. Each `data:` line is a JSON event with a `type`:
    status | evidence | argument | verdict | error | done.
    """
    sym = symbol.upper()
    if not resolve_symbol(sym):
        raise HTTPException(status_code=400, detail=f"Unsupported NSE symbol: {sym}")

    user_id = user.id   # read now — the request's DB session closes before streaming ends

    async def event_source():
        async for event in run_debate(sym, user_id, refresh=refresh):
            yield f"data: {json.dumps(event, default=str)}\n\n"

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
