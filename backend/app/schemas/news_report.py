from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.news_sentiment import NewsSentimentResult
from app.schemas.news_summary import NewsArticleForSummary, NewsSummaryResult, validate_symbol
from app.schemas.recommendation import RecommendationResult


class NewsReportRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    articles: list[NewsArticleForSummary] = Field(..., min_length=1)
    max_key_points: int = Field(default=5, ge=1, le=10)

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, value: str) -> str:
        return validate_symbol(value)


class NewsReportAgentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: NewsSummaryResult
    sentiment: NewsSentimentResult


class NewsReportResult(NewsReportAgentResult):
    recommendation: RecommendationResult
