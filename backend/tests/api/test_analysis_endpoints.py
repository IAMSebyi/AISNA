from fastapi.testclient import TestClient

from app.api.v1.endpoints import analysis
from app.main import app
from app.schemas.news_sentiment import NewsSentimentResult
from app.schemas.news_summary import NewsSummaryResult
from app.services.llm import LLMConfigurationError, LLMServiceError


client = TestClient(app)


def sample_article() -> dict:
    return {
        "title": "Apple services revenue grows",
        "source": "Reuters",
        "url": "https://example.com/apple-services",
        "published_at": "2026-05-11",
        "description": "Services revenue remains resilient.",
        "content": "Apple services revenue continued to grow.",
    }


class SummaryAgentStub:
    async def run(self, request):
        return NewsSummaryResult(
            symbol=request.symbol.upper(),
            short_summary="Apple services revenue grew.",
            detailed_summary="The supplied article says Apple services revenue continued to grow.",
            key_points=["Services revenue continued to grow."],
            risks=["The article does not provide detailed financial metrics."],
            source_count=len(request.articles),
            citations=[
                {
                    "article_index": 1,
                    "title": request.articles[0].title,
                    "url": request.articles[0].url,
                }
            ],
        )


class SentimentAgentStub:
    async def run(self, request):
        return NewsSentimentResult(
            symbol=request.symbol.upper(),
            overall_sentiment="positive",
            confidence=0.82,
            source_count=len(request.articles),
            positive_count=1,
            negative_count=0,
            neutral_count=0,
            key_drivers=["Services revenue growth"],
            article_sentiments=[
                {
                    "article_index": 1,
                    "title": request.articles[0].title,
                    "sentiment": "positive",
                    "confidence": 0.82,
                    "reason": "The article describes revenue growth.",
                }
            ],
        )


class ValueErrorAgentStub:
    async def run(self, request):
        raise ValueError("At least one news article is required.")


class ConfigurationErrorAgentStub:
    async def run(self, request):
        raise LLMConfigurationError("OPENAI_API_KEY is not configured.")


class ServiceErrorAgentStub:
    async def run(self, request):
        raise LLMServiceError("OpenAI request failed.")


def test_news_summary_endpoint_returns_agent_output(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_news_summarizer_agent",
        lambda: SummaryAgentStub(),
    )

    response = client.post(
        "/api/v1/analysis/news-summary",
        json={
            "symbol": "aapl",
            "articles": [sample_article()],
            "max_key_points": 3,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "AAPL"
    assert payload["source_count"] == 1
    assert payload["citations"][0]["title"] == "Apple services revenue grows"


def test_news_sentiment_endpoint_adds_recommendation(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_news_sentiment_agent",
        lambda: SentimentAgentStub(),
    )

    response = client.post(
        "/api/v1/analysis/news-sentiment",
        json={
            "symbol": "aapl",
            "articles": [sample_article()],
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["symbol"] == "AAPL"
    assert payload["overall_sentiment"] == "positive"
    assert payload["recommendation"]["action"] == "Buy"
    assert payload["recommendation"]["reasoning"]


def test_news_summary_endpoint_rejects_invalid_payload():
    response = client.post(
        "/api/v1/analysis/news-summary",
        json={"symbol": "AAPL", "articles": []},
    )

    assert response.status_code == 422


def test_news_summary_endpoint_returns_bad_request_for_agent_value_error(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_news_summarizer_agent",
        lambda: ValueErrorAgentStub(),
    )

    response = client.post(
        "/api/v1/analysis/news-summary",
        json={
            "symbol": "AAPL",
            "articles": [sample_article()],
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "At least one news article is required."


def test_news_summary_endpoint_returns_service_unavailable_for_missing_openai_key(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_news_summarizer_agent",
        lambda: ConfigurationErrorAgentStub(),
    )

    response = client.post(
        "/api/v1/analysis/news-summary",
        json={
            "symbol": "AAPL",
            "articles": [sample_article()],
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "OPENAI_API_KEY is not configured."


def test_news_sentiment_endpoint_returns_bad_gateway_for_llm_service_error(monkeypatch):
    monkeypatch.setattr(
        analysis,
        "get_news_sentiment_agent",
        lambda: ServiceErrorAgentStub(),
    )

    response = client.post(
        "/api/v1/analysis/news-sentiment",
        json={
            "symbol": "AAPL",
            "articles": [sample_article()],
        },
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "OpenAI request failed."
