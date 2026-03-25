import httpx
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from app.core.config import settings

NEWS_API_URL = "https://newsdata.io/api/1/news"

KEYWORDS = "NSE OR BSE OR RBI OR \"Indian stock\" OR \"Indian market\" OR Sensex OR Nifty"

_analyzer = SentimentIntensityAnalyzer()


def _score_sentiment(text: str) -> dict:
    """Return VADER compound score + a human-readable label."""
    if not text:
        return {"score": 0.0, "label": "Neutral"}
    scores = _analyzer.polarity_scores(text)
    compound = round(scores["compound"], 3)
    if compound >= 0.05:
        label = "Positive"
    elif compound <= -0.05:
        label = "Negative"
    else:
        label = "Neutral"
    return {"score": compound, "label": label}


async def fetch_breaking_news(limit: int = 15) -> dict:
    """
    Fetch latest Indian market news from NewsData.io.
    Returns articles with per-article sentiment + overall market sentiment.
    """
    params = {
        "apikey": settings.NEWS_API_KEY,
        "q": KEYWORDS,
        "language": "en",
        "country": "in",
        "category": "business",
        "size": min(limit, 10),   # NewsData.io free tier max is 10 per request
    }

    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.get(NEWS_API_URL, params=params)
        res.raise_for_status()
        data = res.json()

    articles = []
    for a in data.get("results", []):
        title = a.get("title") or ""
        description = a.get("description") or ""
        sentiment = _score_sentiment(f"{title}. {description}")

        articles.append({
            "title": title,
            "description": description,
            "source": a.get("source_id", "Unknown"),
            "url": a.get("link", ""),
            "image_url": a.get("image_url"),
            "published_at": a.get("pubDate", ""),
            "sentiment": sentiment,
        })

    # Overall market sentiment: average compound score
    if articles:
        avg_score = round(
            sum(art["sentiment"]["score"] for art in articles) / len(articles), 3
        )
        if avg_score >= 0.05:
            market_label = "Bullish"
        elif avg_score <= -0.05:
            market_label = "Bearish"
        else:
            market_label = "Neutral"
        market_sentiment = {"score": avg_score, "label": market_label}
    else:
        market_sentiment = {"score": 0.0, "label": "Neutral"}

    return {
        "articles": articles,
        "market_sentiment": market_sentiment,
        "total": len(articles),
    }