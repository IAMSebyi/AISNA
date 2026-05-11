from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field


RecommendationLabel = Literal["Buy", "Hold", "Sell"]


class RecommendationResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: RecommendationLabel
    confidence: float = Field(..., ge=0.0, le=1.0)
    score: float = Field(..., ge=-1.0, le=1.0)
    reasoning: str
    factors: List[str]
