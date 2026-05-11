const API_BASE = '/api/v1/stocks';

export async function fetchStockNews(symbol) {
  const response = await fetch(`${API_BASE}/${symbol}/news`);
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const detail = errorPayload?.detail || `Request failed with status ${response.status}`;
    throw new Error(detail);
  }
  return response.json();
}
