import json
from pathlib import Path

import pytest

from app.evaluation.metrics import evaluate_risk_profile_focus
from app.evaluation.schemas import RiskProfileEvaluationCase
from app.schemas.news_summary import NewsSummaryResult


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "risk_profile_evaluation_cases.json"


@pytest.fixture(scope="module")
def risk_profile_cases() -> list[dict]:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def test_all_cases_have_required_fields(risk_profile_cases: list[dict]):
    for case in risk_profile_cases:
        assert "id" in case
        assert "risk_profile" in case
        assert "summary_output" in case
        assert "risk_profile_expectations" in case


def test_conservative_profile_emphasizes_risks(risk_profile_cases: list[dict]):
    case = next(c for c in risk_profile_cases if c["risk_profile"] == "Conservative")

    output = NewsSummaryResult.model_validate(case["summary_output"])
    expected = RiskProfileEvaluationCase.model_validate(case["risk_profile_expectations"])

    report = evaluate_risk_profile_focus(output, expected)

    assert report.passed, (
        f"{case['id']} failed Conservative risk profile evaluation:\n"
        + "\n".join(report.reasons)
    )


def test_conservative_profile_lists_sufficient_risks(risk_profile_cases: list[dict]):
    case = next(c for c in risk_profile_cases if c["risk_profile"] == "Conservative")

    output = NewsSummaryResult.model_validate(case["summary_output"])
    expected = RiskProfileEvaluationCase.model_validate(case["risk_profile_expectations"])

    assert len(output.risks) >= expected.min_risks_listed, (
        f"{case['id']}: Conservative profile must list at least "
        f"{expected.min_risks_listed} risks, got {len(output.risks)}"
    )


def test_aggressive_profile_emphasizes_growth(risk_profile_cases: list[dict]):
    case = next(c for c in risk_profile_cases if c["risk_profile"] == "Aggressive")

    output = NewsSummaryResult.model_validate(case["summary_output"])
    expected = RiskProfileEvaluationCase.model_validate(case["risk_profile_expectations"])

    report = evaluate_risk_profile_focus(output, expected)

    assert report.passed, (
        f"{case['id']} failed Aggressive risk profile evaluation:\n"
        + "\n".join(report.reasons)
    )


def test_aggressive_profile_has_sufficient_key_points(risk_profile_cases: list[dict]):
    case = next(c for c in risk_profile_cases if c["risk_profile"] == "Aggressive")

    output = NewsSummaryResult.model_validate(case["summary_output"])
    expected = RiskProfileEvaluationCase.model_validate(case["risk_profile_expectations"])

    assert len(output.key_points) >= expected.min_key_points, (
        f"{case['id']}: Aggressive profile must highlight at least "
        f"{expected.min_key_points} key points, got {len(output.key_points)}"
    )


def test_balanced_profile_covers_both_sides(risk_profile_cases: list[dict]):
    case = next(c for c in risk_profile_cases if c["risk_profile"] == "Balanced")

    output = NewsSummaryResult.model_validate(case["summary_output"])
    expected = RiskProfileEvaluationCase.model_validate(case["risk_profile_expectations"])

    report = evaluate_risk_profile_focus(output, expected)

    assert report.passed, (
        f"{case['id']} failed Balanced risk profile evaluation:\n"
        + "\n".join(report.reasons)
    )


def test_balanced_profile_mentions_risks_and_growth(risk_profile_cases: list[dict]):
    case = next(c for c in risk_profile_cases if c["risk_profile"] == "Balanced")

    output = NewsSummaryResult.model_validate(case["summary_output"])
    full_text = " ".join([
        output.short_summary,
        output.detailed_summary,
        " ".join(output.key_points),
        " ".join(output.risks),
    ]).lower()

    growth_keywords = ["growth", "expansion", "opportunity", "upside"]
    risk_keywords = ["risk", "concern", "caution", "headwind", "uncertainty"]

    has_growth = any(kw in full_text for kw in growth_keywords)
    has_risk = any(kw in full_text for kw in risk_keywords)

    assert has_growth and has_risk, (
        f"{case['id']}: Balanced profile must mention both growth and risk signals. "
        f"Growth found: {has_growth}, Risk found: {has_risk}"
    )


def test_no_forbidden_keywords_in_any_profile(risk_profile_cases: list[dict]):
    for case in risk_profile_cases:
        output = NewsSummaryResult.model_validate(case["summary_output"])
        expected = RiskProfileEvaluationCase.model_validate(case["risk_profile_expectations"])

        full_text = " ".join([
            output.short_summary,
            output.detailed_summary,
            " ".join(output.key_points),
            " ".join(output.risks),
        ]).lower()

        for keyword in expected.forbidden_focus_keywords:
            assert keyword.lower() not in full_text, (
                f"{case['id']}: forbidden keyword '{keyword}' found in "
                f"{expected.risk_profile} profile summary"
            )


def test_all_profiles_have_valid_short_summary_length(risk_profile_cases: list[dict]):
    max_words = 60
    for case in risk_profile_cases:
        output = NewsSummaryResult.model_validate(case["summary_output"])
        word_count = len(output.short_summary.split())
        assert word_count <= max_words, (
            f"{case['id']}: short_summary has {word_count} words, "
            f"expected at most {max_words}"
        )


def test_all_profiles_have_citations(risk_profile_cases: list[dict]):
    for case in risk_profile_cases:
        output = NewsSummaryResult.model_validate(case["summary_output"])
        assert len(output.citations) >= 1, (
            f"{case['id']}: summary must include at least one citation"
        )
