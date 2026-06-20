import pytest
from fastapi.testclient import TestClient
import httpx

from app.api.v1.endpoints import stocks
from app.services import news_cache
from app.main import app


client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_news_cache(tmp_path, monkeypatch):
    news_cache.clear()
    monkeypatch.setattr(stocks.settings, "NEWS_CACHE_DIR", str(tmp_path / "news"))
    yield
    news_cache.clear()


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
                    "ticker_sentiment": [
                        {
                            "ticker": "AAPL",
                            "relevance_score": "0.91",
                            "ticker_sentiment_score": "0.42",
                            "ticker_sentiment_label": "Somewhat-Bullish",
                        }
                    ],
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
            "sentiment": "Somewhat-Bullish",
            "sentiment_score": 0.42,
            "relevance_score": 0.91,
            "overall_sentiment": "Positive",
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
    assert articles[0]["overall_sentiment"] == "Neutral"


def test_stock_news_filters_articles_without_requested_company_context(monkeypatch):
    install_fake_alpha_vantage(
        monkeypatch,
        {
            "feed": [
                {
                    "title": "GitLab shares fall after restructuring plan",
                    "source": "Investing.com",
                    "url": "https://example.com/gitlab",
                    "time_published": "20260510T123000",
                    "summary": "GitLab discussed restructuring plans and customer retention risks.",
                    "overall_sentiment_label": "Neutral",
                    "category_within_source": "General",
                    "ticker_sentiment": [
                        {
                            "ticker": "MSFT",
                            "relevance_score": "0.62",
                            "ticker_sentiment_score": "0.14",
                            "ticker_sentiment_label": "Neutral",
                        }
                    ],
                },
                {
                    "title": "Microsoft cloud revenue remains resilient",
                    "source": "Reuters",
                    "url": "https://example.com/msft-cloud",
                    "time_published": "20260510T123000",
                    "summary": "Microsoft Azure revenue continued to grow despite cautious software spending.",
                    "overall_sentiment_label": "Somewhat-Bullish",
                    "category_within_source": "Markets",
                    "ticker_sentiment": [
                        {
                            "ticker": "MSFT",
                            "relevance_score": "0.78",
                            "ticker_sentiment_score": "0.31",
                            "ticker_sentiment_label": "Somewhat-Bullish",
                        }
                    ],
                },
            ]
        },
    )

    response = client.get("/api/v1/stocks/MSFT/news?limit=5")

    assert response.status_code == 200
    articles = response.json()
    assert len(articles) == 1
    assert articles[0]["title"] == "Microsoft cloud revenue remains resilient"


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


_AAPL_FEED = {
    "feed": [
        {
            "title": "Apple shares rise after services growth",
            "source": "Reuters",
            "url": "https://example.com/aapl-services",
            "time_published": "20260510T123000",
            "summary": "Apple services revenue continued to grow.",
            "overall_sentiment_label": "Positive",
            "category_within_source": "Markets",
            "ticker_sentiment": [
                {
                    "ticker": "AAPL",
                    "relevance_score": "0.91",
                    "ticker_sentiment_score": "0.42",
                    "ticker_sentiment_label": "Somewhat-Bullish",
                }
            ],
        }
    ]
}


def test_stock_news_cache_hit_skips_second_api_call(monkeypatch):
    call_count = {"n": 0}

    class CountingClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def get(self, url, *, params, timeout):
            call_count["n"] += 1
            return FakeResponse(_AAPL_FEED)

    monkeypatch.setattr(stocks.httpx, "AsyncClient", CountingClient)

    client.get("/api/v1/stocks/AAPL/news?limit=1")
    client.get("/api/v1/stocks/AAPL/news?limit=1")

    assert call_count["n"] == 1


def test_stock_news_cache_expired_triggers_refetch(monkeypatch):
    import time

    call_count = {"n": 0}

    class CountingClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return None

        async def get(self, url, *, params, timeout):
            call_count["n"] += 1
            return FakeResponse(_AAPL_FEED)

    monkeypatch.setattr(stocks.httpx, "AsyncClient", CountingClient)

    client.get("/api/v1/stocks/AAPL/news?limit=1")

    # Manually expire the cache entry
    news_cache._store["AAPL"]["fetched_at"] = time.time() - 9999

    client.get("/api/v1/stocks/AAPL/news?limit=1")

    assert call_count["n"] == 2


def test_stock_news_stale_cache_served_on_api_failure(monkeypatch):
    install_fake_alpha_vantage(monkeypatch, _AAPL_FEED)
    client.get("/api/v1/stocks/AAPL/news?limit=1")

    # Expire and then make AV fail
    import time
    news_cache._store["AAPL"]["fetched_at"] = time.time() - 9999
    monkeypatch.setattr(stocks.httpx, "AsyncClient", FailingAsyncClient)

    response = client.get("/api/v1/stocks/AAPL/news?limit=1")

    assert response.status_code == 200
    articles = response.json()
    assert len(articles) == 1
    assert articles[0]["source"] == "Reuters"


def test_stock_news_stale_cache_served_on_rate_limit(monkeypatch):
    import time

    install_fake_alpha_vantage(monkeypatch, _AAPL_FEED)
    client.get("/api/v1/stocks/AAPL/news?limit=1")

    news_cache._store["AAPL"]["fetched_at"] = time.time() - 9999
    install_fake_alpha_vantage(monkeypatch, {"Note": "Thank you for using Alpha Vantage!"})

    response = client.get("/api/v1/stocks/AAPL/news?limit=1")

    assert response.status_code == 200
    assert response.json()[0]["source"] == "Reuters"


def test_stock_news_returns_fallback_when_no_cache_and_rate_limited(monkeypatch):
    install_fake_alpha_vantage(monkeypatch, {"Note": "Thank you for using Alpha Vantage!"})

    response = client.get("/api/v1/stocks/TSLA/news")

    assert response.status_code == 200
    assert response.json()[0]["source"] == "Alpha Vantage Fallback"
