import json

from app.agents.base import BaseAgent
from app.schemas.news_report import NewsReportAgentResult, NewsReportRequest
from app.services.llm import LLMClient, LLMServiceError


class NewsReportAgent(BaseAgent[NewsReportRequest, NewsReportAgentResult]):
    name = "news_report"

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def run(self, agent_input: NewsReportRequest) -> NewsReportAgentResult:
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
            "You are the News Report Agent for AISNA, an AI Stock News Analyzer. "
            "Analyze only the supplied articles for the requested stock ticker. "
            "Return exactly one summary object and one sentiment object in the requested JSON schema. "
            "For the summary: use only supplied articles; keep short_summary at most 60 words; "
            "include at most the requested maximum number of key_points; include risks when evidence is thin; "
            "set source_count to the number of supplied articles; citations must reference supplied article indexes only. "
            "For sentiment: overall_sentiment must be positive, negative, or neutral; "
            "article_sentiments must include exactly one item per supplied article; "
            "positive_count, negative_count, and neutral_count must match article_sentiments; "
            "set source_count to the number of supplied articles; confidence values must be between 0 and 1; "
            "use neutral when evidence is mixed, weak, or mostly factual. "
            "Do not invent facts, financial metrics, prices, URLs, or investment advice."
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
            schema=NewsReportAgentResult.model_json_schema(),
            schema_name="news_report_agent_result",
        )

        report = NewsReportAgentResult.model_validate(result)
        report.summary.symbol = agent_input.symbol.upper()
        report.summary.source_count = len(agent_input.articles)
        report.sentiment.symbol = agent_input.symbol.upper()
        report.sentiment.source_count = len(agent_input.articles)
        self._validate_report(report, source_count=len(agent_input.articles))

        return report

    def _validate_report(self, report: NewsReportAgentResult, *, source_count: int) -> None:
        citation_indexes = {citation.article_index for citation in report.summary.citations}
        invalid_citation_indexes = [
            index for index in citation_indexes if index < 1 or index > source_count
        ]
        if invalid_citation_indexes:
            raise LLMServiceError("News report response referenced an unknown article citation.")

        if len(report.sentiment.article_sentiments) != source_count:
            raise LLMServiceError("News report response did not include sentiment for every article.")

        sentiment_counts = {
            "positive": report.sentiment.positive_count,
            "negative": report.sentiment.negative_count,
            "neutral": report.sentiment.neutral_count,
        }
        actual_counts = {"positive": 0, "negative": 0, "neutral": 0}
        for article_sentiment in report.sentiment.article_sentiments:
            if article_sentiment.article_index < 1 or article_sentiment.article_index > source_count:
                raise LLMServiceError("News report response referenced an unknown sentiment article.")
            actual_counts[article_sentiment.sentiment] += 1

        if sentiment_counts != actual_counts:
            raise LLMServiceError("News report response sentiment counts do not match article sentiments.")
