import json

from app.agents.base import BaseAgent
from app.schemas.news_sentiment import NewsSentimentRequest, NewsSentimentResult
from app.services.llm import LLMClient


class NewsSentimentAgent(BaseAgent[NewsSentimentRequest, NewsSentimentResult]):
    name = "news_sentiment"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, agent_input: NewsSentimentRequest) -> NewsSentimentResult:
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
            "You are the News Sentiment Agent for AISNA, an AI Stock News Analyzer. "
            "Analyze only the supplied news articles for the requested stock ticker. "
            "Classify sentiment as exactly one of: positive, negative, neutral. "
            "Use neutral when the evidence is mixed, weak, or mostly factual. "
            "Do not provide investment advice or invent facts beyond the supplied articles."
        )
        prompt = (
            f"Ticker: {agent_input.symbol.upper()}\n"
            "Articles JSON:\n"
            f"{json.dumps(normalized_articles, ensure_ascii=False)}"
        )

        result = await self.llm_client.generate_json(
            instructions=instructions,
            prompt=prompt,
            schema=NewsSentimentResult.model_json_schema(),
            schema_name="news_sentiment_result",
        )

        sentiment = NewsSentimentResult.model_validate(result)
        sentiment.symbol = agent_input.symbol.upper()
        sentiment.source_count = len(agent_input.articles)

        return sentiment
