from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


SentimentLabel = Literal["positive", "negative", "neutral"]


class NewsArticleForSentiment(BaseModel):
    title: str = Field(..., min_length=1)
    source: str = ""
    url: str = ""
    published_at: str = ""
    description: Optional[str] = None
    content: Optional[str] = None


class NewsSentimentRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    articles: List[NewsArticleForSentiment] = Field(..., min_length=1)


class ArticleSentiment(BaseModel):
    model_config = ConfigDict(extra="forbid")

    article_index: int = Field(..., ge=1)
    title: str
    sentiment: SentimentLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    reason: str


class NewsSentimentResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str
    overall_sentiment: SentimentLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    source_count: int
    positive_count: int = Field(..., ge=0)
    negative_count: int = Field(..., ge=0)
    neutral_count: int = Field(..., ge=0)
    key_drivers: List[str]
    article_sentiments: List[ArticleSentiment]
