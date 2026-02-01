import httpx
from datetime import datetime
from app.core.config import settings

NEWS_API_URL = "https://newsapi.org/v2/everything"

KEYWORDS = (
    "India stock market OR NSE OR BSE OR RBI OR "
    "Indian economy OR US Fed OR inflation OR oil prices OR global markets"
)

async def fetch_breaking_news(limit: int = 10):
    params = {
        "q": KEYWORDS,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": limit,
        "apiKey": settings.NEWS_API_KEY,
    }

    async with httpx.AsyncClient(timeout=10) as client:
        res = await client.get(NEWS_API_URL, params=params)
        res.raise_for_status()
        data = res.json()

    articles = []
    for a in data.get("articles", []):
        articles.append({
            "title": a["title"],
            "source": a["source"]["name"],
            "url": a["url"],
            "published_at": a["publishedAt"],
        })

    return articles
