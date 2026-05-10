from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class NewsArticle(BaseModel):
    source: str
    time: str
    title: str
    sentiment: str
    category: str
    url: Optional[str] = None

class StockQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    signal: str
    sentiment_score: int
    last_updated: datetime = datetime.now()

class MarketSnapshot(BaseModel):
    symbol: str
    price: float
    volume: int
    high: float
    low: float
