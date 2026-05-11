from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.news_sentiment import SentimentLabel
from app.schemas.recommendation import RecommendationLabel


class EvaluationReport(BaseModel):
    passed: bool
    score: float = Field(..., ge=0.0, le=1.0)
    reasons: List[str]


class SummaryEvaluationCase(BaseModel):
    id: str
    required_keywords: List[str] = Field(default_factory=list)
    forbidden_keywords: List[str] = Field(default_factory=list)
    min_key_points: int = 1
    min_citations: int = 1
    max_short_summary_words: int = 80


class SentimentEvaluationCase(BaseModel):
    id: str
    expected_sentiment: SentimentLabel
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    expected_article_sentiments: Optional[List[SentimentLabel]] = None


class RecommendationEvaluationCase(BaseModel):
    id: str
    expected_action: RecommendationLabel
    min_confidence: float = Field(default=0.0, ge=0.0, le=1.0)
