import random

from fastapi import APIRouter, HTTPException, status

from app.agents.news_report import NewsReportAgent
from app.schemas.analysis import AnalysisResult
from app.schemas.news_report import NewsReportRequest, NewsReportResult
from app.services.llm import LLMConfigurationError, LLMServiceError, OpenAIResponsesClient
from app.services.recommendations import generate_recommendation

router = APIRouter()


def get_news_report_agent() -> NewsReportAgent:
    return NewsReportAgent(llm_client=OpenAIResponsesClient())


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


@router.post("/news-report", response_model=NewsReportResult)
async def analyze_news_report(request: NewsReportRequest):
    try:
        agent = get_news_report_agent()
        report = await agent.run(request)
        recommendation = generate_recommendation(report.sentiment)
        return NewsReportResult(
            summary=report.summary,
            sentiment=report.sentiment,
            recommendation=recommendation,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except LLMConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except LLMServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
