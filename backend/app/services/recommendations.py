from app.schemas.news_sentiment import NewsSentimentResult
from app.schemas.recommendation import RecommendationResult


SENTIMENT_SCORES = {
    "positive": 1.0,
    "neutral": 0.0,
    "negative": -1.0,
}


def generate_recommendation(sentiment: NewsSentimentResult) -> RecommendationResult:
    source_count = max(sentiment.source_count, 1)
    article_balance = (sentiment.positive_count - sentiment.negative_count) / source_count
    overall_score = SENTIMENT_SCORES[sentiment.overall_sentiment] * sentiment.confidence
    score = round((article_balance * 0.6) + (overall_score * 0.4), 3)

    if score >= 0.35 and sentiment.confidence >= 0.65:
        action = "Buy"
    elif score <= -0.35 and sentiment.confidence >= 0.65:
        action = "Sell"
    else:
        action = "Hold"

    confidence = _recommendation_confidence(score, sentiment.confidence, sentiment.source_count)
    factors = _build_factors(sentiment)
    reasoning = _build_reasoning(action, score, sentiment, factors)

    return RecommendationResult(
        action=action,
        confidence=confidence,
        score=score,
        reasoning=reasoning,
        factors=factors,
    )


def _recommendation_confidence(score: float, sentiment_confidence: float, source_count: int) -> float:
    evidence_strength = min(source_count / 3, 1.0)
    confidence = ((abs(score) * 0.55) + (sentiment_confidence * 0.45)) * evidence_strength
    return round(max(0.0, min(confidence, 1.0)), 3)


def _build_factors(sentiment: NewsSentimentResult) -> list[str]:
    factors = [
        f"Overall news sentiment is {sentiment.overall_sentiment}.",
        (
            f"Article split: {sentiment.positive_count} positive, "
            f"{sentiment.neutral_count} neutral, {sentiment.negative_count} negative."
        ),
    ]

    factors.extend(sentiment.key_drivers[:3])
    return factors


def _build_reasoning(
    action: str,
    score: float,
    sentiment: NewsSentimentResult,
    factors: list[str],
) -> str:
    if action == "Buy":
        decision = "Positive news evidence is strong enough to support a Buy recommendation."
    elif action == "Sell":
        decision = "Negative news evidence is strong enough to support a Sell recommendation."
    else:
        decision = "The evidence is mixed, weak, or not confident enough, so Hold is preferred."

    return (
        f"{decision} The recommendation score is {score}, based on "
        f"{sentiment.source_count} article(s) and sentiment confidence {sentiment.confidence}. "
        f"Main factor: {factors[0]}"
    )
