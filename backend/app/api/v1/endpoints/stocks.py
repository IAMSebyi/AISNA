from datetime import datetime
import logging
import random
import re
from typing import List

from fastapi import APIRouter, HTTPException, Query
import httpx
import yfinance as yf

from app.schemas.stock import StockQuote, NewsArticle, MarketSnapshot
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

ALPHA_VANTAGE_NEWS_URL = "https://www.alphavantage.co/query"
SYMBOL_PATTERN = re.compile(r"^[A-Z0-9.-]{1,12}$")

@router.get("/market/snapshot", response_model=List[MarketSnapshot])
def get_market_snapshot(symbols: str = "AAPL,MSFT,NVDA,GOOGL,AMZN,META,TSLA"):
    symbol_list = [s.strip().upper() for s in symbols.split(",")]
    tickers = yf.Tickers(" ".join(symbol_list))
    
    snapshots = []
    for symbol in symbol_list:
        try:
            ticker = tickers.tickers.get(symbol)
            if ticker:
                info = ticker.fast_info
                # Calculate change
                prev_close = info.previous_close
                last_price = info.last_price
                change = last_price - prev_close
                change_percent = (change / prev_close) * 100 if prev_close else 0.0
                
                snapshots.append({
                    "symbol": symbol,
                    "price": round(last_price, 2),
                    "change": round(change, 2),
                    "change_percent": round(change_percent, 2),
                    "volume": int(info.last_volume) if info.last_volume else 0,
                    "high": round(info.day_high, 2) if info.day_high else 0.0,
                    "low": round(info.day_low, 2) if info.day_low else 0.0
                })
        except Exception as e:
            logger.error(f"Error fetching snapshot for {symbol}: {e}")
            continue
            
    return snapshots

@router.get("/{symbol}", response_model=StockQuote)
def get_stock_quote(symbol: str):
    symbol = symbol.upper()
    # Mock data
    base_prices = {"AAPL": 189.43, "TSLA": 240.50, "MSFT": 370.20, "GOOGL": 140.10}
    base_price = base_prices.get(symbol, 150.0)
    
    current_price = base_price + random.uniform(-5, 5)
    return {
        "symbol": symbol,
        "name": f"{symbol} Inc.",
        "price": round(current_price, 2),
        "change": round(current_price - base_price, 2),
        "change_percent": round(((current_price - base_price) / base_price) * 100, 2),
        "signal": "BUY" if current_price > base_price else "HOLD",
        "sentiment_score": random.randint(60, 95)
    }

@router.get("/{symbol}/news", response_model=List[NewsArticle])
async def get_stock_news(symbol: str, limit: int = Query(default=5, ge=1, le=20)):
    symbol = _normalize_symbol(symbol)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                ALPHA_VANTAGE_NEWS_URL,
                params={
                    "function": "NEWS_SENTIMENT",
                    "tickers": symbol,
                    "apikey": settings.ALPHA_VANTAGE_API_KEY,
                },
                timeout=10.0,
            )
            response.raise_for_status()
            data = response.json()

        feed = data.get("feed") or []
        if not feed:
            logger.warning("Alpha Vantage returned no feed for %s: %s", symbol, data)
            return _fallback_news(symbol)[:limit]

        return [_map_alpha_vantage_article(item) for item in feed[:limit]]
    except httpx.HTTPError as e:
        logger.error("Error fetching news for %s: %s", symbol, e)
        raise HTTPException(
            status_code=502,
            detail="Stock news provider is currently unavailable. Please try again later.",
        )


def _normalize_symbol(symbol: str) -> str:
    normalized_symbol = symbol.strip().upper()
    if not SYMBOL_PATTERN.fullmatch(normalized_symbol):
        raise HTTPException(
            status_code=400,
            detail="Ticker symbol must be 1-12 characters and contain only letters, numbers, dots, or hyphens.",
        )
    return normalized_symbol


def _map_alpha_vantage_article(item: dict) -> dict:
    time_published = item.get("time_published", "")
    summary = item.get("summary", "")

    return {
        "title": item.get("title", ""),
        "source": item.get("source", ""),
        "url": item.get("url", ""),
        "published_at": _format_alpha_vantage_date(time_published),
        "description": summary,
        "content": summary,
        "time": time_published,
        "sentiment": item.get("overall_sentiment_label", ""),
        "category": item.get("category_within_source", ""),
    }


def _format_alpha_vantage_date(time_published: str) -> str:
    try:
        return datetime.strptime(time_published, "%Y%m%dT%H%M%S").date().isoformat()
    except (TypeError, ValueError):
        return time_published or ""


def _fallback_news(symbol: str) -> list[dict]:
    return [
        {
            "source": "Alpha Vantage Fallback",
            "time": "",
            "title": f"{symbol} news temporarily unavailable",
            "sentiment": "Neutral",
            "category": "Fallback",
            "published_at": "",
            "description": "No external news feed was returned for this ticker.",
            "content": "No external news feed was returned for this ticker.",
        }
    ]
