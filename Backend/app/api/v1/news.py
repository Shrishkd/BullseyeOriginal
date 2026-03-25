from fastapi import APIRouter, HTTPException
from app.services.news_service import fetch_breaking_news

router = APIRouter(prefix="/news", tags=["News"])


@router.get("/breaking")
async def get_breaking_news(limit: int = 15):
    try:
        return await fetch_breaking_news(limit=limit)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"News fetch failed: {str(e)}")