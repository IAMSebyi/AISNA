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
    throw new Error('Analysis is currently unavailable. Please try again shortly.');
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
    return 'AI analysis is not available right now. You can still search and read the latest news.';
  }

  return detail || `Request failed with status ${status}`;
}

export function analyzeNewsReport(payload) {
  return postJson('/news-report', payload);
}
