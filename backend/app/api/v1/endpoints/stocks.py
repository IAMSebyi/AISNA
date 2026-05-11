from fastapi import APIRouter, HTTPException
from typing import List
import random
from app.schemas.stock import StockQuote, NewsArticle, MarketSnapshot
import yfinance as yf
import httpx
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

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
async def get_stock_news(symbol: str):
    symbol = symbol.upper()
    api_key = settings.ALPHA_VANTAGE_API_KEY
    url = f"https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers={symbol}&apikey={api_key}"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
        feed = data.get("feed", [])
        
        if not feed:
            # Fallback for mock data if API limits or demo key restrictions occur
            return [
                {
                    "source": "Bloomberg",
                    "time": "10m ago",
                    "title": f"{symbol} Announces Surprise Early Event Amidst Strong Q3 Projections",
                    "sentiment": "Positive",
                    "category": "Hardware",
                    "published_at": "2026-05-11",
                    "description": f"Mock data for {symbol} due to API limitations.",
                    "content": f"Mock data for {symbol} due to API limitations."
                },
                {
                    "source": "Reuters",
                    "time": "45m ago",
                    "title": "Supply Chain Partners Report Increased Component Orders for Q4",
                    "sentiment": "Positive",
                    "category": "Supply",
                    "published_at": "2026-05-11",
                    "description": "More mock data fallback.",
                    "content": "More mock data fallback."
                }
            ]
            
        articles = []
        for item in feed[:5]:
            time_pub = item.get("time_published", "")
            if time_pub and len(time_pub) == 15: # format: YYYYMMDDTHHMMSS
                formatted_time = f"{time_pub[:4]}-{time_pub[4:6]}-{time_pub[6:8]}"
            else:
                formatted_time = time_pub

            articles.append({
                "title": item.get("title", ""),
                "source": item.get("source", ""),
                "url": item.get("url", ""),
                "published_at": formatted_time,
                "description": item.get("summary", ""),
                "content": item.get("summary", ""),
                "time": time_pub,
                "sentiment": item.get("overall_sentiment_label", ""),
                "category": item.get("category_within_source", "")
            })
        return articles
    except Exception as e:
        logger.error(f"Error fetching news for {symbol}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stock news")
