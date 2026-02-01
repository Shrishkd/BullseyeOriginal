from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.market_providers.router import get_provider
import asyncio

router = APIRouter()


@router.websocket("/ws/market/{symbol}")
async def market_ws(websocket: WebSocket, symbol: str):
    """
    WebSocket endpoint for live market price updates.
    Auth intentionally disabled for stability.
    """

    await websocket.accept()

    try:
        # Resolve provider + instrument key
        provider, instrument_key = await get_provider(symbol)

        # Send initial LTP
        quote = await provider.fetch_quote(instrument_key)
        await websocket.send_json({
            "symbol": symbol,
            "price": quote.get("price"),
            "type": "initial"
        })

        # Poll every 1 second
        while True:
            await asyncio.sleep(1)

            quote = await provider.fetch_quote(instrument_key)
            if not quote:
                continue

            await websocket.send_json({
                "symbol": symbol,
                "price": quote.get("price"),
                "type": "update"
            })

    except WebSocketDisconnect:
        print(f"WebSocket disconnected for {symbol}")

    except Exception as e:
        print("WebSocket error:", e)
        try:
            await websocket.send_json({"error": str(e)})
        finally:
            await websocket.close()
