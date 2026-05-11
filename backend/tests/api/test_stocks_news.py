from fastapi.testclient import TestClient
import httpx

from app.api.v1.endpoints import stocks
from app.main import app


client = TestClient(app)


class FakeResponse:
    def __init__(self, payload: dict):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeAsyncClient:
    def __init__(self, payload: dict, captured_request: dict):
        self.payload = payload
        self.captured_request = captured_request

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    async def get(self, url: str, *, params: dict, timeout: float):
        self.captured_request.update(
            {
                "url": url,
                "params": params,
                "timeout": timeout,
            }
        )
        return FakeResponse(self.payload)


class FailingAsyncClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return None

    async def get(self, url: str, *, params: dict, timeout: float):
        raise httpx.ConnectError("provider unavailable")


def install_fake_alpha_vantage(monkeypatch, payload: dict) -> dict:
    captured_request = {}

    def fake_async_client():
        return FakeAsyncClient(payload, captured_request)

    monkeypatch.setattr(stocks.httpx, "AsyncClient", fake_async_client)
    return captured_request


def test_stock_news_maps_alpha_vantage_articles(monkeypatch):
    captured_request = install_fake_alpha_vantage(
        monkeypatch,
        {
            "feed": [
                {
                    "title": "Apple shares rise after services growth",
                    "source": "Reuters",
                    "url": "https://example.com/aapl-services",
                    "time_published": "20260510T123000",
                    "summary": "Apple services revenue continued to grow.",
                    "overall_sentiment_label": "Positive",
                    "category_within_source": "Markets",
                }
            ]
        },
    )

    response = client.get("/api/v1/stocks/aapl/news?limit=1")

    assert response.status_code == 200
    assert captured_request["url"] == stocks.ALPHA_VANTAGE_NEWS_URL
    assert captured_request["params"]["function"] == "NEWS_SENTIMENT"
    assert captured_request["params"]["tickers"] == "AAPL"
    assert captured_request["timeout"] == 10.0

    articles = response.json()
    assert articles == [
        {
            "source": "Reuters",
            "time": "20260510T123000",
            "title": "Apple shares rise after services growth",
            "sentiment": "Positive",
            "category": "Markets",
            "url": "https://example.com/aapl-services",
            "published_at": "2026-05-10",
            "description": "Apple services revenue continued to grow.",
            "content": "Apple services revenue continued to grow.",
        }
    ]


def test_stock_news_returns_fallback_when_feed_is_empty(monkeypatch):
    install_fake_alpha_vantage(monkeypatch, {"Note": "API limit reached"})

    response = client.get("/api/v1/stocks/tsla/news")

    assert response.status_code == 200
    articles = response.json()
    assert len(articles) == 1
    assert articles[0]["source"] == "Alpha Vantage Fallback"
    assert articles[0]["title"] == "TSLA news temporarily unavailable"
    assert articles[0]["sentiment"] == "Neutral"


def test_stock_news_rejects_invalid_symbol():
    response = client.get("/api/v1/stocks/INVALID!/news")

    assert response.status_code == 400
    assert "Ticker symbol" in response.json()["detail"]


def test_stock_news_returns_provider_error_when_external_api_fails(monkeypatch):
    monkeypatch.setattr(stocks.httpx, "AsyncClient", FailingAsyncClient)

    response = client.get("/api/v1/stocks/AAPL/news")

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Stock news provider is currently unavailable. Please try again later."
    )
