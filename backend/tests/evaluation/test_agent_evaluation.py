import json
from pathlib import Path

import pytest

from app.evaluation.metrics import (
    evaluate_recommendation,
    evaluate_sentiment,
    evaluate_summary,
)
from app.evaluation.schemas import (
    RecommendationEvaluationCase,
    SentimentEvaluationCase,
    SummaryEvaluationCase,
)
from app.schemas.news_sentiment import NewsSentimentRecommendationResult, NewsSentimentResult
from app.schemas.news_summary import NewsSummaryResult
from app.services.recommendations import generate_recommendation


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "agent_evaluation_cases.json"


@pytest.fixture(scope="module")
def evaluation_cases() -> list[dict]:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def test_summary_quality_evaluation_cases(evaluation_cases: list[dict]):
    for case in evaluation_cases:
        output = NewsSummaryResult.model_validate(case["summary_output"])
        expected = SummaryEvaluationCase.model_validate(case["summary_expectations"])

        report = evaluate_summary(output, expected)

        assert report.passed, f"{case['id']} failed summary evaluation: {report.reasons}"


def test_sentiment_quality_evaluation_cases(evaluation_cases: list[dict]):
    for case in evaluation_cases:
        output = NewsSentimentRecommendationResult.model_validate(case["sentiment_output"])
        expected = SentimentEvaluationCase.model_validate(case["sentiment_expectations"])

        report = evaluate_sentiment(output, expected)

        assert report.passed, f"{case['id']} failed sentiment evaluation: {report.reasons}"


def test_recommendation_quality_evaluation_cases(evaluation_cases: list[dict]):
    for case in evaluation_cases:
        output = NewsSentimentRecommendationResult.model_validate(case["sentiment_output"])
        expected = RecommendationEvaluationCase.model_validate(
            case["recommendation_expectations"]
        )

        report = evaluate_recommendation(output.recommendation, expected)

        assert report.passed, f"{case['id']} failed recommendation evaluation: {report.reasons}"


def test_recommendation_logic_against_ground_truth_cases(evaluation_cases: list[dict]):
    for case in evaluation_cases:
        sentiment_payload = dict(case["sentiment_output"])
        sentiment_payload.pop("recommendation", None)
        sentiment = NewsSentimentResult.model_validate(sentiment_payload)
        expected = RecommendationEvaluationCase.model_validate(
            case["recommendation_expectations"]
        )

        recommendation = generate_recommendation(sentiment)

        assert recommendation.action == expected.expected_action, (
            f"{case['id']} expected {expected.expected_action}, "
            f"got {recommendation.action}"
        )
