# AI Tools Usage Report

## Overview

This document describes how AI tools were used during the development of AISNA (AI Stock News Analyzer), a web application that analyzes stock news and generates summaries, sentiment analysis, and Buy / Hold / Sell recommendations.

---

## AI Tools Used

### 1. OpenAI API (GPT models)

**Role in the project:** Core AI functionality

The OpenAI API is the engine behind the main feature of the application. It powers the **News Report Agent**, which receives a list of raw news articles for a given stock ticker and returns a structured JSON response containing:

- A short and detailed **summary** of the news
- Key points and identified risks
- Per-article **sentiment labels** (positive / negative / neutral) with confidence scores
- An overall sentiment score

The agent uses structured output (JSON schema enforcement) to ensure the response always conforms to the expected data model, making it safe to parse directly into Pydantic schemas without manual validation of the LLM output format.

**How it was integrated:**

A thin `OpenAIResponsesClient` class in [`backend/app/services/llm.py`](backend/app/services/llm.py) wraps the OpenAI Responses API. It takes a system instruction, a user prompt, and a JSON schema, and returns a validated dictionary. This abstraction keeps the agent logic decoupled from the specific OpenAI SDK, making it straightforward to swap the underlying model or provider.

The agent itself lives in [`backend/app/agents/news_report.py`](backend/app/agents/news_report.py) and adds a post-processing validation step: it checks that citation indexes reference only supplied articles, and that per-article sentiment counts match the declared totals. This guards against hallucinated or inconsistent outputs from the model.

---

### 2. Claude Code (Anthropic)

**Role in the project:** Development assistance

Claude Code was used as an AI pair programmer during development. Specific contributions include:

- **CI/CD pipeline** — the entire `.github/workflows/ci.yml` file was written with Claude Code assistance, including the four parallel jobs (backend tests, evaluation tests, linting, frontend build) and pip/npm caching configuration
- **Debugging** — identifying and fixing a ruff linting error (`List` imported but unused in `backend/app/schemas/stock.py`)
- **Code review** — reviewing the CI workflow for correctness before pushing

---

### 3. Antigravity

**Role in the project:** UI/UX Design

Antigravity was used during the design phase of the project to create the visual layout and user interface of the application.

---

### 4. Google Stitch

**Role in the project:** UI/UX Design

Google Stitch was used alongside Antigravity for designing the application's interface, helping define the visual structure and component layout before implementation in React.

---

## AI-Assisted vs. Human-Written Code

| Component | Author |
|---|---|
| News Report Agent prompt and instructions | Human + AI iteration |
| `OpenAIResponsesClient` LLM wrapper | Human |
| Agent output validation logic | Human |
| Evaluation metrics (`metrics.py`) | Human |
| CI/CD GitHub Actions workflow | AI-assisted (Claude Code) |
| FastAPI endpoints and schemas | Human |
| React frontend | Human |
| Buy / Hold / Sell recommendation logic | Human |

---

## Evaluation of AI Output Quality

Because the News Report Agent produces free-form text that is hard to unit test directly, a dedicated evaluation workflow was implemented in [`backend/app/evaluation/`](backend/app/evaluation/). It uses fixture-based test cases with expected outcomes and checks:

- **Summary quality** — keyword presence, key point count, citation count, word limits
- **Sentiment accuracy** — correct overall label, confidence thresholds, per-article consistency
- **Recommendation correctness** — action matches expected label, confidence threshold, reasoning present

This allows the team to catch regressions in agent behavior when the model, prompt, or schema changes.

---

## Limitations and Observations

- The OpenAI model can occasionally return sentiment counts that do not match the per-article breakdown. The post-processing validator in the agent catches and rejects these responses.
- Structured output (JSON schema enforcement) significantly reduced the need for prompt engineering around output format.
- AI-generated summaries are grounded only in the supplied articles — the prompt explicitly forbids the model from inventing financial metrics or prices.
