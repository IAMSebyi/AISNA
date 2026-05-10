from fastapi import APIRouter, HTTPException
from typing import List
import random
from app.schemas.stock import StockQuote, NewsArticle

router = APIRouter()

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
def get_stock_news(symbol: str):
    return [
        {
            "source": "Bloomberg",
            "time": "10m ago",
            "title": f"{symbol.upper()} Announces Surprise Early Event Amidst Strong Q3 Projections",
            "sentiment": "Positive",
            "category": "Hardware"
        },
        {
            "source": "Reuters",
            "time": "45m ago",
            "title": "Supply Chain Partners Report Increased Component Orders for Q4",
            "sentiment": "Positive",
            "category": "Supply"
        }
    ]
