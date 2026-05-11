import json

from app.agents.base import BaseAgent
from app.schemas.news_summary import NewsSummaryRequest, NewsSummaryResult
from app.services.llm import LLMClient


class NewsSummarizerAgent(BaseAgent[NewsSummaryRequest, NewsSummaryResult]):
    name = "news_summarizer"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, agent_input: NewsSummaryRequest) -> NewsSummaryResult:
        if not agent_input.articles:
            raise ValueError("At least one news article is required.")

        normalized_articles = [
            {
                "index": index,
                "title": article.title,
                "source": article.source,
                "url": article.url,
                "published_at": article.published_at,
                "description": article.description,
                "content": article.content,
            }
            for index, article in enumerate(agent_input.articles, start=1)
        ]

        instructions = (
            "You are the News Summarizer Agent for AISNA, an AI Stock News Analyzer. "
            "Summarize only the supplied articles that are relevant to the requested stock ticker. "
            "Do not invent facts, financial metrics, prices, or investment advice. "
            "If the articles are thin, say so in the summary. "
            "Keep the output concise, neutral, and useful for a retail investor."
        )
        prompt = (
            f"Ticker: {agent_input.symbol.upper()}\n"
            f"Maximum key points: {agent_input.max_key_points}\n"
            "Articles JSON:\n"
            f"{json.dumps(normalized_articles, ensure_ascii=False)}"
        )

        result = await self.llm_client.generate_json(
            instructions=instructions,
            prompt=prompt,
            schema=NewsSummaryResult.model_json_schema(),
            schema_name="news_summary_result",
        )

        summary = NewsSummaryResult.model_validate(result)
        summary.symbol = agent_input.symbol.upper()
        summary.source_count = len(agent_input.articles)

        return summary
