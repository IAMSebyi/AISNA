const API_BASE = '/api/v1/stocks';
const SYMBOL_PATTERN = /^[A-Z0-9.-]{1,12}$/;

export function normalizeStockSymbol(symbol) {
  return symbol.trim().toUpperCase();
}

export function isValidStockSymbol(symbol) {
  return SYMBOL_PATTERN.test(normalizeStockSymbol(symbol));
}

export async function fetchStockNews(symbol, limit = 5) {
  const normalizedSymbol = normalizeStockSymbol(symbol);
  let response;

  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(normalizedSymbol)}/news?limit=${limit}`);
  } catch {
    throw new Error('News is currently unavailable. Please try again shortly.');
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const detail = errorPayload?.detail || `Request failed with status ${response.status}`;
    throw new Error(detail);
  }
  return response.json();
}
