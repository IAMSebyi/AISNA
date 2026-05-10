from fastapi import APIRouter
from app.schemas.analysis import AnalysisResult
import random

router = APIRouter()

@router.get("/sentiment/{symbol}", response_model=AnalysisResult)
def get_sentiment_analysis(symbol: str):
    symbol = symbol.upper()
    sentiments = ["Bullish", "Neutral", "Bearish"]
    selected = random.choice(sentiments)
    
    return {
        "symbol": symbol,
        "overall_sentiment": selected,
        "scores": {
            "news_sentiment": random.uniform(0.5, 0.9),
            "social_media": random.uniform(0.4, 0.8),
            "technical_indicators": random.uniform(0.3, 0.7)
        },
        "key_drivers": [
            "Strong quarterly earnings growth",
            "Expansion into emerging markets",
            "Positive analyst upgrades"
        ],
        "recommendation": "Maintain Long Position" if selected == "Bullish" else "Observe Market Volatility"
    }
