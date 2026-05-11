from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class NewsArticleForSummary(BaseModel):
    title: str = Field(..., min_length=1)
    source: str = ""
    url: str = ""
    published_at: str = ""
    description: Optional[str] = None
    content: Optional[str] = None


class NewsSummaryRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    articles: List[NewsArticleForSummary] = Field(..., min_length=1)
    max_key_points: int = Field(default=5, ge=1, le=10)


class SummaryCitation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    article_index: int = Field(..., ge=1)
    title: str
    url: str


class NewsSummaryResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    symbol: str
    short_summary: str
    detailed_summary: str
    key_points: List[str]
    risks: List[str]
    source_count: int
    citations: List[SummaryCitation]
