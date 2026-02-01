# app/services/symbol_resolver.py

from app.services.instrument_registry import resolve_symbol


def get_instrument_key(symbol: str) -> str:
    key = resolve_symbol(symbol)
    if not key:
        raise ValueError(f"Unsupported NSE symbol: {symbol}")
    return key


