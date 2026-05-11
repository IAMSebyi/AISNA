import random

from fastapi import APIRouter, HTTPException, status

from app.agents.news_sentiment import NewsSentimentAgent
from app.agents.news_summarizer import NewsSummarizerAgent
from app.schemas.analysis import AnalysisResult
from app.schemas.news_sentiment import NewsSentimentRequest, NewsSentimentResult
from app.schemas.news_summary import NewsSummaryRequest, NewsSummaryResult
from app.services.llm import LLMConfigurationError, LLMServiceError, OpenAIResponsesClient

router = APIRouter()


def get_news_summarizer_agent() -> NewsSummarizerAgent:
    return NewsSummarizerAgent(llm_client=OpenAIResponsesClient())


def get_news_sentiment_agent() -> NewsSentimentAgent:
    return NewsSentimentAgent(llm_client=OpenAIResponsesClient())


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


@router.post("/news-summary", response_model=NewsSummaryResult)
async def summarize_news(request: NewsSummaryRequest):
    try:
        agent = get_news_summarizer_agent()
        return await agent.run(request)
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


@router.post("/news-sentiment", response_model=NewsSentimentResult)
async def analyze_news_sentiment(request: NewsSentimentRequest):
    try:
        agent = get_news_sentiment_agent()
        return await agent.run(request)
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
