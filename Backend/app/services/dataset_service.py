import pandas as pd
from app.services.market_providers.upstox import UpstoxProvider

provider = UpstoxProvider()


async def get_market_dataframe(instrument_key: str, resolution="5", limit=200):
    candles = await provider.fetch_candles(
        instrument_key=instrument_key,
        resolution=resolution,
        limit=limit
    )

    if not candles:
        raise ValueError("No data received")

    df = pd.DataFrame(candles)

    df["time"] = pd.to_datetime(df["time"], unit="ms")
    df = df.sort_values("time").reset_index(drop=True)

    return df