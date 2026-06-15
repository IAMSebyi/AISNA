import json
import logging
import yfinance as yf
from app.agents.base import BaseAgent
from app.schemas.portfolio import PortfolioReportRequest, PortfolioReportResult
from app.services.llm import LLMClient

logger = logging.getLogger(__name__)

class PortfolioAdvisorAgent(BaseAgent[PortfolioReportRequest, PortfolioReportResult]):
    name = "portfolio_advisor"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, agent_input: PortfolioReportRequest) -> PortfolioReportResult:
        assets_summary = []
        
        # Calculate total value of the portfolio
        total_value = sum(asset.shares * asset.current_price for asset in agent_input.assets)
        total_value = max(total_value, 1.0)  # Avoid division by zero
        
        for asset in agent_input.assets:
            symbol = asset.symbol.upper()
            weight = ((asset.shares * asset.current_price) / total_value) * 100
            gain_loss_percent = ((asset.current_price - asset.average_price) / asset.average_price * 100) if asset.average_price else 0.0
            
            # Fetch headlines using yfinance (which is free and doesn't hit Alpha Vantage rate limits)
            headlines = []
            try:
                ticker = yf.Ticker(symbol)
                news = ticker.news or []
                for item in news[:3]:
                    title = item.get("title")
                    if title:
                        headlines.append(title)
            except Exception as e:
                logger.warning(f"Failed to fetch yfinance news for {symbol}: {e}")
                
            if not headlines:
                headlines = [f"No recent news articles found for ticker {symbol}."]
                
            assets_summary.append({
                "symbol": symbol,
                "shares": asset.shares,
                "weight_percent": round(weight, 2),
                "gain_loss_percent": round(gain_loss_percent, 2),
                "recent_headlines": headlines
            })

        instructions = (
            "You are the Senior Portfolio Risk Officer and AI Advisor for AISNA. "
            "You will be given a list of stock assets in the user's portfolio, including their portfolio weight, "
            "investment gains/losses, and recent news headlines. "
            "Your task is to analyze the portfolio and return exactly one JSON response matching the requested schema. "
            "Analyze: "
            "1. Diversification: Assess if the portfolio is too concentrated (e.g., over-exposed to a single asset or sector). "
            "Return a diversification_score from 0 to 100 (where 100 is highly diversified across sectors, and lower scores represent high concentration risk). "
            "2. Sentiment Risk: Analyze the collective news sentiment across all holdings. If the majority of news headlines are negative or indicate high risk, "
            "set sentiment_risk to 'High'. If positive or growth-focused, set to 'Low'. If mixed or neutral, set to 'Medium'. "
            "3. Summary: Provide a professional, concise summary (at most 100 words) summarizing the health of the portfolio, highlighting the primary risks or strengths. "
            "4. Advisory Notes: Provide a list of 2 to 4 actionable bullet points offering recommendations (e.g., rebalancing, hedging, or taking profits/cutting losses). "
            "Do not invent facts, and make recommendations based only on the provided asset weights, performance, and headlines."
        )

        prompt = (
            f"Portfolio Total Value: ${total_value:,.2f}\n"
            f"Assets Details:\n"
            f"{json.dumps(assets_summary, indent=2, ensure_ascii=False)}"
        )

        result = await self.llm_client.generate_json(
            instructions=instructions,
            prompt=prompt,
            schema=PortfolioReportResult.model_json_schema(),
            schema_name="portfolio_report_result",
        )

        return PortfolioReportResult.model_validate(result)
