import re

import httpx
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from app.core.config import settings
from app.services.instrument_registry import resolve_name

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


async def _fetch_articles(params: dict) -> list[dict]:
    """Call NewsData.io and attach a VADER sentiment score to every article."""
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
    return articles


_NAME_SUFFIXES = re.compile(r"\b(LIMITED|LTD|LT|CORPORATION|CORP|INC)\b\.?", re.I)

# Headline names for large caps whose instrument-master name is truncated or
# whose ticker collides with sister companies (Reliance Power, Reliance Infra…)
NEWS_ALIASES = {
    "RELIANCE":   '"Reliance Industries" OR RIL',
    "TCS":        '"Tata Consultancy" OR TCS',
    "INFY":       "Infosys",
    "SBIN":       '"State Bank of India" OR SBI',
    "HDFCBANK":   '"HDFC Bank"',
    "ICICIBANK":  '"ICICI Bank"',
    "KOTAKBANK":  '"Kotak Mahindra Bank" OR "Kotak Bank"',
    "AXISBANK":   '"Axis Bank"',
    "BAJFINANCE": '"Bajaj Finance"',
    "HINDUNILVR": '"Hindustan Unilever" OR HUL',
    "MARUTI":     '"Maruti Suzuki"',
    "LT":         '"Larsen & Toubro" OR "L&T"',
    "BHARTIARTL": '"Bharti Airtel" OR Airtel',
    "HCLTECH":    '"HCL Tech" OR HCLTech',
    "TATAMOTORS": '"Tata Motors"',
    "TATASTEEL":  '"Tata Steel"',
    "SUNPHARMA":  '"Sun Pharma"',
    "M&M":        '"Mahindra & Mahindra" OR "M&M"',
}


def _company_query(symbol: str) -> str:
    """
    Headline search for a symbol: alias, else cleaned company name, adding the
    ticker only when it's an acronym (TCS, INFY) rather than a word of the name.
    """
    ticker = symbol.upper()
    if ticker in NEWS_ALIASES:
        return NEWS_ALIASES[ticker]
    name = _NAME_SUFFIXES.sub("", resolve_name(symbol) or "").strip().title()
    if len(name) < 3:
        return ticker
    if ticker in name.upper().split():
        return f'"{name}"'
    return f'"{name}" OR {ticker}'


async def fetch_symbol_news(symbol: str, limit: int = 10) -> dict:
    """
    Company-specific news with VADER sentiment.

    Besides the average score, returns an intra-window trend: average of the
    newer half of headlines minus the older half (positive = improving).
    """
    # qInTitle, not q: full-text search matches articles that only mention the
    # company in passing, which drowns the signal.
    params = {
        "apikey": settings.NEWS_API_KEY,
        "qInTitle": _company_query(symbol),
        "language": "en",
        "country": "in",
        "size": min(limit, 10),
    }
    articles = await _fetch_articles(params)
    articles.sort(key=lambda a: a["published_at"] or "")   # oldest → newest

    scores = [a["sentiment"]["score"] for a in articles]
    avg = round(sum(scores) / len(scores), 3) if scores else 0.0

    window_trend = None
    if len(scores) >= 4:
        half = len(scores) // 2
        older, newer = scores[:half], scores[-half:]
        window_trend = round(sum(newer) / len(newer) - sum(older) / len(older), 3)

    return {
        "symbol": symbol.upper(),
        "query": params["qInTitle"],
        "articles": articles,
        "score": avg,
        "label": "Bullish" if avg >= 0.05 else "Bearish" if avg <= -0.05 else "Neutral",
        "positive": sum(1 for s in scores if s >= 0.05),
        "negative": sum(1 for s in scores if s <= -0.05),
        "neutral": sum(1 for s in scores if -0.05 < s < 0.05),
        "window_trend": window_trend,
        "total": len(articles),
    }


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

    articles = await _fetch_articles(params)

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