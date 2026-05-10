from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI(title="EquiSynth AI Backend")

# Allow CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to actual frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/status")
def get_status():
    return {
        "status": "operational",
        "nodes": {
            "news_alpha": "active",
            "sentiment_beta": "processing",
            "logic_gamma": "idle",
            "data_node": "active"
        }
    }

@app.get("/api/ticker/{symbol}")
def get_ticker_data(symbol: str):
    symbol = symbol.upper()
    # Dummy data generation for demonstration
    base_price = 150.0 if symbol != "AAPL" else 189.43
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

@app.get("/api/news/{symbol}")
def get_news(symbol: str):
    return {
        "symbol": symbol.upper(),
        "articles": [
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
    }
