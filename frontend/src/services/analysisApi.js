const API_BASE = '/api/v1/analysis';

async function postJson(path, payload) {
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Backend is unavailable. Start the FastAPI server and try again.');
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const detail = formatAnalysisError(errorPayload?.detail, response.status);
    throw new Error(detail);
  }

  return response.json();
}

function formatAnalysisError(detail, status) {
  if (typeof detail === 'string' && detail.includes('OPENAI_API_KEY')) {
    return 'OpenAI API key is not configured. You can still search and read news, but AI analysis requires backend/.env to include OPENAI_API_KEY.';
  }

  return detail || `Request failed with status ${status}`;
}

export function summarizeNews(payload) {
  return postJson('/news-summary', payload);
}

export function analyzeNewsSentiment(payload) {
  return postJson('/news-sentiment', payload);
}
