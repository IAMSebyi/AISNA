from app.evaluation.schemas import (
    EvaluationReport,
    RecommendationEvaluationCase,
    SentimentEvaluationCase,
    SummaryEvaluationCase,
)
from app.schemas.news_sentiment import NewsSentimentRecommendationResult, NewsSentimentResult
from app.schemas.news_summary import NewsSummaryResult
from app.schemas.recommendation import RecommendationResult


def evaluate_summary(
    output: NewsSummaryResult,
    expected: SummaryEvaluationCase,
) -> EvaluationReport:
    checks = [
        _check(
            _contains_all_keywords(output, expected.required_keywords),
            "summary contains required keywords",
        ),
        _check(
            _contains_no_keywords(output, expected.forbidden_keywords),
            "summary does not contain forbidden keywords",
        ),
        _check(
            len(output.key_points) >= expected.min_key_points,
            f"summary has at least {expected.min_key_points} key point(s)",
        ),
        _check(
            len(output.citations) >= expected.min_citations,
            f"summary has at least {expected.min_citations} citation(s)",
        ),
        _check(
            _word_count(output.short_summary) <= expected.max_short_summary_words,
            f"short summary has at most {expected.max_short_summary_words} words",
        ),
        _check(
            output.source_count >= len(output.citations),
            "source count covers returned citations",
        ),
    ]

    return _build_report(checks)


def evaluate_sentiment(
    output: NewsSentimentResult | NewsSentimentRecommendationResult,
    expected: SentimentEvaluationCase,
) -> EvaluationReport:
    checks = [
        _check(
            output.overall_sentiment == expected.expected_sentiment,
            f"overall sentiment is {expected.expected_sentiment}",
        ),
        _check(
            output.confidence >= expected.min_confidence,
            f"sentiment confidence is at least {expected.min_confidence}",
        ),
        _check(
            output.positive_count + output.negative_count + output.neutral_count
            == output.source_count,
            "sentiment counts match source count",
        ),
        _check(
            len(output.article_sentiments) == output.source_count,
            "article-level sentiment exists for each source",
        ),
    ]

    if expected.expected_article_sentiments is not None:
        actual = [article.sentiment for article in output.article_sentiments]
        checks.append(
            _check(
                actual == expected.expected_article_sentiments,
                "article-level sentiments match expected labels",
            )
        )

    return _build_report(checks)


def evaluate_recommendation(
    output: RecommendationResult,
    expected: RecommendationEvaluationCase,
) -> EvaluationReport:
    checks = [
        _check(
            output.action == expected.expected_action,
            f"recommendation action is {expected.expected_action}",
        ),
        _check(
            output.confidence >= expected.min_confidence,
            f"recommendation confidence is at least {expected.min_confidence}",
        ),
        _check(
            output.reasoning.strip() != "",
            "recommendation includes reasoning",
        ),
        _check(
            len(output.factors) > 0,
            "recommendation includes factors",
        ),
    ]

    return _build_report(checks)


def _contains_all_keywords(output: NewsSummaryResult, keywords: list[str]) -> bool:
    text = _summary_text(output)
    return all(keyword.lower() in text for keyword in keywords)


def _contains_no_keywords(output: NewsSummaryResult, keywords: list[str]) -> bool:
    text = _summary_text(output)
    return all(keyword.lower() not in text for keyword in keywords)


def _summary_text(output: NewsSummaryResult) -> str:
    return " ".join(
        [
            output.short_summary,
            output.detailed_summary,
            " ".join(output.key_points),
            " ".join(output.risks),
        ]
    ).lower()


def _word_count(text: str) -> int:
    return len(text.split())


def _check(passed: bool, reason: str) -> tuple[bool, str]:
    return passed, reason


def _build_report(checks: list[tuple[bool, str]]) -> EvaluationReport:
    passed_checks = [reason for passed, reason in checks if passed]
    failed_checks = [reason for passed, reason in checks if not passed]
    score = len(passed_checks) / len(checks) if checks else 1.0

    return EvaluationReport(
        passed=len(failed_checks) == 0,
        score=round(score, 3),
        reasons=[f"PASS: {reason}" for reason in passed_checks]
        + [f"FAIL: {reason}" for reason in failed_checks],
    )
