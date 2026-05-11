const API_BASE = '/api/v1/analysis';

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const detail = errorPayload?.detail || `Request failed with status ${response.status}`;
    throw new Error(detail);
  }

  return response.json();
}

export function summarizeNews(payload) {
  return postJson('/news-summary', payload);
}

export function analyzeNewsSentiment(payload) {
  return postJson('/news-sentiment', payload);
}
