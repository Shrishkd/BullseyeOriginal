# app/tasks/fetch_prices.py
from .celery_app import celery_app
import asyncio
import datetime

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.models import Asset, Price
from app.services.market_providers.router import get_provider

engine = create_async_engine(
    settings.DATABASE_URL,
    future=True,
    echo=False,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@celery_app.task
def fetch_and_store(symbol: str):
    """
    Celery task (sync entrypoint).
    Fetches latest quote using market provider and stores it in DB.
    """

    async def _run():
        provider = await get_provider(symbol)
        quote = await provider.fetch_quote(symbol)

        # Provider-safe guard
        if not isinstance(quote, dict) or "price" not in quote:
            return {"status": "no_data", "symbol": symbol}

        timestamp = datetime.datetime.utcfromtimestamp(
            quote.get("timestamp", int(datetime.datetime.utcnow().timestamp()))
        )

        async with AsyncSessionLocal() as db:
            # Find or create asset
            res = await db.execute(
                Asset.__table__.select().where(Asset.symbol == symbol)
            )
            row = res.first()

            if row:
                asset_id = row[0]
            else:
                asset = Asset(symbol=symbol, name=symbol)
                db.add(asset)
                await db.commit()
                await db.refresh(asset)
                asset_id = asset.id

            price = Price(
                asset_id=asset_id,
                timestamp=timestamp,
                open=quote.get("open", quote["price"]),
                high=quote.get("high", quote["price"]),
                low=quote.get("low", quote["price"]),
                close=quote["price"],
                volume=quote.get("volume", 0.0),
            )

            db.add(price)
            await db.commit()

        return {"status": "ok", "symbol": symbol, "price": quote["price"]}

    return asyncio.run(_run())
