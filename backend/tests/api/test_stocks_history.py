import pandas as pd
from fastapi.testclient import TestClient

from app.api.v1.endpoints import stocks
from app.main import app

client = TestClient(app)


class FakeTicker:
    def __init__(self, symbol: str, data: pd.DataFrame):
        self.symbol = symbol
        self.data = data

    def history(self, period: str = "1mo"):
        return self.data


def test_get_stock_history_success(monkeypatch):
    dates = pd.date_range(start="2026-05-01", periods=3, freq="D")
    df = pd.DataFrame(
        {"Close": [150.5, 152.0, 151.25], "Volume": [1000, 1500, 1200]}, index=dates
    )

    def fake_ticker(symbol):
        return FakeTicker(symbol, df)

    monkeypatch.setattr(stocks.yf, "Ticker", fake_ticker)

    response = client.get("/api/v1/stocks/AAPL/history?period=1mo")
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"
    assert data["period"] == "1mo"
    assert len(data["history"]) == 3
    assert data["history"][0] == {"date": "2026-05-01", "close": 150.5, "volume": 1000}
    assert data["history"][1] == {"date": "2026-05-02", "close": 152.0, "volume": 1500}
    assert data["history"][2] == {"date": "2026-05-03", "close": 151.25, "volume": 1200}


def test_get_stock_history_empty_returns_404(monkeypatch):
    df = pd.DataFrame(columns=["Close", "Volume"])

    def fake_ticker(symbol):
        return FakeTicker(symbol, df)

    monkeypatch.setattr(stocks.yf, "Ticker", fake_ticker)

    response = client.get("/api/v1/stocks/AAPL/history")
    assert response.status_code == 404
    assert "No historical price data found" in response.json()["detail"]


def test_get_stock_history_invalid_period():
    response = client.get("/api/v1/stocks/AAPL/history?period=invalid")
    assert response.status_code == 400
    assert "Period must be one of" in response.json()["detail"]


def test_get_stock_history_invalid_symbol():
    response = client.get("/api/v1/stocks/INVALID!/history")
    assert response.status_code == 400
    assert "Ticker symbol" in response.json()["detail"]
