from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app import models


async def create_price(
    db: AsyncSession, asset_id: int, timestamp, open, high, low, close, volume
):
    price = models.Price(
        asset_id=asset_id,
        timestamp=timestamp,
        open=open,
        high=high,
        low=low,
        close=close,
        volume=volume,
    )
    db.add(price)
    await db.commit()
    await db.refresh(price)
    return price


async def get_recent_prices(db: AsyncSession, asset_id: int, limit: int = 100):
    res = await db.execute(
        select(models.Price)
        .where(models.Price.asset_id == asset_id)
        .order_by(desc(models.Price.timestamp))
        .limit(limit)
    )
    return list(res.scalars().all())
