# D:\Git\Bullseye\Backend\app\services\symbol.py
SYMBOL_MAP = {
    "RELIANCE": "NSE_EQ|INE002A01018",
    "TCS": "NSE_EQ|INE467B01029",
    "INFY": "NSE_EQ|INE009A01021",
}

def resolve_instrument_key(symbol: str) -> str | None:
    return SYMBOL_MAP.get(symbol.upper())
