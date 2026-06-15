from fastapi import APIRouter, HTTPException, status
from app.agents.portfolio_advisor import PortfolioAdvisorAgent
from app.schemas.portfolio import PortfolioReportRequest, PortfolioReportResult
from app.services.llm import LLMConfigurationError, LLMServiceError, OpenAIResponsesClient

router = APIRouter()


def get_portfolio_advisor_agent() -> PortfolioAdvisorAgent:
    return PortfolioAdvisorAgent(llm_client=OpenAIResponsesClient())


@router.post("/portfolio-report", response_model=PortfolioReportResult)
async def analyze_portfolio_report(request: PortfolioReportRequest):
    try:
        agent = get_portfolio_advisor_agent()
        report = await agent.run(request)
        return report
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
