from pydantic import BaseModel, Field

class PortfolioAsset(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=12)
    shares: float = Field(..., gt=0)
    average_price: float = Field(..., ge=0)
    current_price: float = Field(..., ge=0)

class PortfolioReportRequest(BaseModel):
    assets: list[PortfolioAsset] = Field(..., min_length=1)

class PortfolioReportResult(BaseModel):
    summary: str
    diversification_score: int = Field(..., ge=0, le=100)
    sentiment_risk: str = Field(..., pattern="^(Low|Medium|High)$")
    advisory_notes: list[str]
