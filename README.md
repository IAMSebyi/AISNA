# AISNA - AI Stock News Analyzer

## Project Description

AISNA (AI Stock News Analyzer) is an application that allows users to enter a stock ticker (e.g., AAPL, TSLA, NVDA) and receive:

- latest relevant news about the company
- an AI-generated summary
- sentiment analysis of the news
- a simple Buy / Hold / Sell recommendation

The project includes two AI agents:

- News Summarizer Agent - summarizes news articles about the selected company
- Sentiment & Recommendation Agent - analyzes sentiment and provides a simple recommendation

This project is developed as part of the Software Development Methods laboratory course at the Faculty of Mathematics and Computer Science, University of Bucharest.

## Current Backend Features

- OpenAI-backed News Summarizer Agent
- OpenAI-backed News Sentiment Agent
- Deterministic Buy / Hold / Sell recommendation logic based on sentiment results
- Evaluation workflow for summary quality, sentiment labels, and recommendation logic
- FastAPI endpoints exposed under `/api/v1`

## Backend Setup

From the repository root:

```bash
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

Create `backend/.env` from `backend/.env.example` and set:

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=low
OPENAI_TIMEOUT_SECONDS=30
```

Run the backend:

```powershell
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8010
```

API docs:

```text
http://127.0.0.1:8010/docs
```

## AI Agent Endpoints

### News Summary

```text
POST /api/v1/analysis/news-summary
```

Generates a structured summary, key points, risks, and citations for supplied news articles.

### News Sentiment and Recommendation

```text
POST /api/v1/analysis/news-sentiment
```

Analyzes supplied news articles as `positive`, `negative`, or `neutral`, then generates a Buy / Hold / Sell recommendation with confidence, score, reasoning, and factors.

## Evaluation Workflow

The backend includes pytest-based evaluation tests for the AI agents. The current fixture data is synthetic and can be replaced or extended once real labeled data is collected.

Run from the `backend` directory:

```bash
pytest tests/evaluation
```

Evaluation files:

- `backend/app/evaluation/metrics.py`
- `backend/app/evaluation/schemas.py`
- `backend/tests/evaluation/fixtures/agent_evaluation_cases.json`
- `backend/tests/evaluation/test_agent_evaluation.py`

## User Stories

| ID   | User Story                                                                                                                                                   | Priority | Status      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------- |
| US1  | As a user, I want to enter a stock ticker so that I can see information about a company.                                                                     | High     | To Do       |
| US2  | As a user, I want to see the latest news about the selected company so that I can understand the current context.                                            | High     | To Do       |
| US3  | As a user, I want to receive an AI-generated summary of the news so that I can save time.                                                                    | High     | Done        |
| US4  | As a user, I want to see whether the overall sentiment of the news is positive, negative, or neutral so that I can quickly understand the market perception. | High     | Done        |
| US5  | As a user, I want to receive a simple Buy / Hold / Sell recommendation so that I can interpret the news more easily.                                         | Medium   | Done        |
| US6  | As a user, I want to see the reasoning behind the recommendation so that I can understand why that decision was suggested.                                   | Medium   | Done        |
| US7  | As a user, I want to save favorite tickers so that I can track them more easily.                                                                             | Medium   | To Do       |
| US8  | As a user, I want to see my search history so that I can quickly return to previously analyzed companies.                                                    | Medium   | To Do       |
| US9  | As a user, I want a clean and easy-to-use interface so that I can quickly access the information I need.                                                     | High     | To Do       |
| US10 | As a developer, I want to automatically test the main functionalities so that I can reduce errors and ensure the application works correctly.                | High     | In Progress |
| US11 | As a developer, I want a CI/CD pipeline so that builds and tests run automatically on each commit.                                                           | Medium   | To Do       |
| US12 | As a developer, I want to evaluate the AI agents' output so that I can verify that the results are coherent and useful.                                      | High     | In Progress |
