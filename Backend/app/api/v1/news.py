from fastapi import APIRouter
from app.services.news_service import fetch_breaking_news

router = APIRouter(prefix="/news", tags=["News"])

@router.get("/breaking")
async def get_breaking_news():
    return await fetch_breaking_news()
