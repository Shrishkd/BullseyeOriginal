from app.services.symbol_resolver import get_instrument_key
from app.services.market_providers.upstox import UpstoxProvider


async def get_provider(symbol: str):
    instrument_key = get_instrument_key(symbol)
    provider = UpstoxProvider()
    return provider, instrument_key
