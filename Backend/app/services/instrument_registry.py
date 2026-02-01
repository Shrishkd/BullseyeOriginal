import os
import csv
import gzip
import requests
import io
from datetime import datetime, timedelta

INSTRUMENT_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.csv.gz"
CACHE_DIR = "data"
CACHE_FILE = os.path.join(CACHE_DIR, "nse_instruments.csv")
CACHE_TTL_HOURS = 24

_symbol_map = {}


def _cache_valid():
    if not os.path.exists(CACHE_FILE):
        return False
    mtime = datetime.fromtimestamp(os.path.getmtime(CACHE_FILE))
    return datetime.now() - mtime < timedelta(hours=CACHE_TTL_HOURS)


def _get_symbol(row: dict) -> str | None:
    """
    Handles different Upstox CSV formats safely
    """
    return (
        row.get("tradingsymbol")
        or row.get("trading_symbol")
        or row.get("symbol")
    )


def load_instruments():
    global _symbol_map

    os.makedirs(CACHE_DIR, exist_ok=True)

    # -------- Download if cache missing or stale --------
    if not _cache_valid():
        print("Downloading NSE instrument master...")

        r = requests.get(INSTRUMENT_URL, timeout=30)
        r.raise_for_status()

        with gzip.open(io.BytesIO(r.content), "rt", encoding="utf-8") as gz:
            reader = csv.DictReader(gz)
            with open(CACHE_FILE, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, reader.fieldnames)
                writer.writeheader()

                for row in reader:
                    if row.get("exchange") == "NSE_EQ":
                        writer.writerow(row)

    # -------- Load into memory --------
    _symbol_map.clear()

    with open(CACHE_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            symbol = _get_symbol(row)
            instrument_key = row.get("instrument_key")

            if not symbol or not instrument_key:
                continue

            _symbol_map[symbol.upper()] = instrument_key

    print(f"NSE instruments loaded: {len(_symbol_map)} symbols")


def resolve_symbol(symbol: str):
    return _symbol_map.get(symbol.upper())
