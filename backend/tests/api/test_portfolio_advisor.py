from fastapi.testclient import TestClient
from app.api.v1.endpoints import portfolio
from app.main import app
from app.schemas.portfolio import PortfolioReportResult

client = TestClient(app)


def build_portfolio_report_result() -> PortfolioReportResult:
    return PortfolioReportResult(
        summary="Your portfolio is well diversified with moderate risk.",
        diversification_score=85,
        sentiment_risk="Medium",
        advisory_notes=["Consider adding some bonds.", "Keep tracking NVDA earnings."]
    )


class PortfolioAdvisorAgentStub:
    async def run(self, request):
        return build_portfolio_report_result()


def test_portfolio_report_endpoint_returns_report(monkeypatch):
    monkeypatch.setattr(
        portfolio,
        "get_portfolio_advisor_agent",
        lambda: PortfolioAdvisorAgentStub()
    )

    response = client.post(
        "/api/v1/analysis/portfolio-report",
        json={
            "assets": [
                {
                    "symbol": "AAPL",
                    "shares": 10.0,
                    "average_price": 180.0,
                    "current_price": 190.0
                }
            ]
        }
    )

    assert response.status_code == 200
    data = response.json()
    assert data["diversification_score"] == 85
    assert data["sentiment_risk"] == "Medium"
    assert len(data["advisory_notes"]) == 2


def test_portfolio_report_endpoint_rejects_empty_assets():
    response = client.post(
        "/api/v1/analysis/portfolio-report",
        json={"assets": []}
    )
    assert response.status_code == 422


def test_portfolio_report_endpoint_rejects_invalid_risk_assets():
    response = client.post(
        "/api/v1/analysis/portfolio-report",
        json={
            "assets": [
                {
                    "symbol": "",
                    "shares": -5.0,
                    "average_price": -10.0,
                    "current_price": 10.0
                }
            ]
        }
    )
    assert response.status_code == 422
