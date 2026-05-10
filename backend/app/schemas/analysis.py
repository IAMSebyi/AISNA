from pydantic import BaseModel
from typing import List, Dict

class SentimentScore(BaseModel):
    label: str  # e.g., "Bullish", "Bearish", "Neutral"
    score: float # 0.0 to 1.0
    confidence: float

class AnalysisResult(BaseModel):
    symbol: str
    overall_sentiment: str
    scores: Dict[str, float]
    key_drivers: List[str]
    recommendation: str
