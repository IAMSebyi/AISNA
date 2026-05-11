from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class NewsArticle(BaseModel):
    source: str
    time: Optional[str] = None
    title: str
    sentiment: Optional[str] = None
    category: Optional[str] = None
    url: Optional[str] = None
    published_at: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None

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
    change: float
    change_percent: float
    volume: int
    high: float
    low: float
