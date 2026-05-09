# Backend/app/crud/portfolio.py

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
from typing import List, Optional

from app import models
from app.schemas import HoldingCreate


async def get_holdings(db: AsyncSession, user_id: int) -> List[models.PortfolioHolding]:
    res = await db.execute(
        select(models.PortfolioHolding)
        .where(models.PortfolioHolding.user_id == user_id)
        .order_by(models.PortfolioHolding.created_at.desc())
    )
    return list(res.scalars().all())


async def get_holding_by_id(
    db: AsyncSession, holding_id: int, user_id: int
) -> Optional[models.PortfolioHolding]:
    res = await db.execute(
        select(models.PortfolioHolding).where(
            models.PortfolioHolding.id == holding_id,
            models.PortfolioHolding.user_id == user_id,
        )
    )
    return res.scalars().first()


async def create_holding(
    db: AsyncSession,
    user_id: int,
    data: HoldingCreate,
) -> models.PortfolioHolding:
    holding = models.PortfolioHolding(
        user_id=user_id,
        symbol=data.symbol.upper().strip(),
        quantity=data.quantity,
        buy_price=data.buy_price,
        buy_date=data.buy_date,
        asset_type=data.asset_type or "stock",
    )
    db.add(holding)
    await db.commit()
    await db.refresh(holding)
    return holding


async def delete_holding(
    db: AsyncSession, holding_id: int, user_id: int
) -> bool:
    result = await db.execute(
        select(models.PortfolioHolding).where(
            models.PortfolioHolding.id == holding_id,
            models.PortfolioHolding.user_id == user_id,
        )
    )
    holding = result.scalars().first()
    if not holding:
        return False
    await db.delete(holding)
    await db.commit()
    return True


async def bulk_create_holdings(
    db: AsyncSession,
    user_id: int,
    holdings: List[HoldingCreate],
) -> List[models.PortfolioHolding]:
    created = []
    for data in holdings:
        h = models.PortfolioHolding(
            user_id=user_id,
            symbol=data.symbol.upper().strip(),
            quantity=data.quantity,
            buy_price=data.buy_price,
            buy_date=data.buy_date,
            asset_type=data.asset_type or "stock",
        )
        db.add(h)
        created.append(h)
    await db.commit()
    for h in created:
        await db.refresh(h)
    return created