import re
from datetime import date, datetime
from typing import List, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


SYMBOL_PATTERN = re.compile(r"^[A-Z0-9.-]{1,12}$")
ALPHA_PATTERN = re.compile(r"[A-Za-z]")
PROMPT_INJECTION_PATTERNS = [
    re.compile(
        r"\b(ignore|bypass|override|forget|disregard)\b.{0,80}\b(prompt|instruction|system|developer|json|schema)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(chatgpt|openai|llm|language model)\b.{0,80}\b(ignore|bypass|override|forget|disregard|generate|write|print|output)\b",
        re.IGNORECASE,
    ),
    re.compile(
        r"\b(generate|write|print|output)\b.{0,80}\b(hello world|c\+\+|python|javascript|code)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\b(act as|you are now|system prompt|developer message)\b", re.IGNORECASE),
]


def validate_symbol(value: str) -> str:
    normalized_value = value.strip().upper()
    if not SYMBOL_PATTERN.fullmatch(normalized_value):
        raise ValueError(
            "Ticker symbol must be 1-12 characters and contain only letters, numbers, dots, or hyphens."
        )
    return normalized_value


def validate_optional_url(value: str) -> str:
    normalized_value = value.strip()
    if not normalized_value:
        return ""

    parsed_url = urlparse(normalized_value)
    if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
        raise ValueError("Article URL must be a valid http(s) URL.")
    return normalized_value


def validate_optional_published_at(value: str) -> str:
    normalized_value = value.strip()
    if not normalized_value:
        return ""

    try:
        if "T" in normalized_value:
            datetime.fromisoformat(normalized_value.replace("Z", "+00:00"))
        else:
            date.fromisoformat(normalized_value)
    except ValueError as exc:
        raise ValueError("Published date must be a valid ISO date or datetime.") from exc

    return normalized_value


def reject_prompt_injection(value: Optional[str], field_name: str) -> Optional[str]:
    if value is None:
        return None

    normalized_value = value.strip()
    if not normalized_value:
        return normalized_value

    for pattern in PROMPT_INJECTION_PATTERNS:
        if pattern.search(normalized_value):
            raise ValueError(f"Article {field_name} appears to contain prompt-injection text.")

    return normalized_value


class NewsArticleForSummary(BaseModel):
    title: str = Field(..., min_length=1, max_length=240)
    source: str = Field(default="", max_length=120)
    url: str = Field(default="", max_length=2048)
    published_at: str = Field(default="", max_length=40)
    description: Optional[str] = Field(default=None, max_length=1200)
    content: Optional[str] = Field(default=None, max_length=8000)
    sentiment: Optional[str] = Field(default=None, max_length=40)
    category: Optional[str] = Field(default=None, max_length=120)
    relevance_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    sentiment_score: Optional[float] = Field(default=None, ge=-1.0, le=1.0)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized_value = reject_prompt_injection(value, "title")
        if not normalized_value or len(ALPHA_PATTERN.findall(normalized_value)) < 3:
            raise ValueError("Article title must contain meaningful text.")
        return normalized_value

    @field_validator("source", "category")
    @classmethod
    def strip_optional_short_text(cls, value: Optional[str]) -> Optional[str]:
        return value.strip() if isinstance(value, str) else value

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return validate_optional_url(value)

    @field_validator("published_at")
    @classmethod
    def validate_published_at(cls, value: str) -> str:
        return validate_optional_published_at(value)

    @field_validator("description", "content", "sentiment")
    @classmethod
    def validate_article_text(cls, value: Optional[str], info) -> Optional[str]:
        return reject_prompt_injection(value, info.field_name)

    @model_validator(mode="after")
    def validate_article_has_evidence(self):
        article_text = " ".join(
            value or "" for value in [self.title, self.description, self.content]
        )
        words = re.findall(r"[A-Za-z0-9][A-Za-z0-9'.-]*", article_text)
        if len(words) < 5 or len(ALPHA_PATTERN.findall(article_text)) < 20:
            raise ValueError("Article must include enough title, description, or content text to analyze.")
        return self


class NewsSummaryRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    articles: List[NewsArticleForSummary] = Field(..., min_length=1)
    max_key_points: int = Field(default=5, ge=1, le=10)

    @field_validator("symbol")
    @classmethod
    def validate_symbol(cls, value: str) -> str:
        return validate_symbol(value)


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
