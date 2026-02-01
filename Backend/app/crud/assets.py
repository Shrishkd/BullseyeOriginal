from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app import models


async def get_asset_by_symbol(db: AsyncSession, symbol: str):
    res = await db.execute(select(models.Asset).where(models.Asset.symbol == symbol))
    return res.scalars().first()


async def create_asset_if_not_exists(
    db: AsyncSession, symbol: str, name: str | None = None, type_: str = "stock"
):
    asset = await get_asset_by_symbol(db, symbol)
    if asset:
        return asset
    new_asset = models.Asset(symbol=symbol, name=name, type=type_)
    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)
    return new_asset
