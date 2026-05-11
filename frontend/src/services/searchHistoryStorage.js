const SEARCH_HISTORY_KEY = 'aisna.searchHistory';
const MAX_SEARCH_HISTORY_ITEMS = 10;

export function getSearchHistory() {
  try {
    const storedValue = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsedValue = JSON.parse(storedValue || '[]');
    return Array.isArray(parsedValue) ? parsedValue.filter(isValidHistoryItem) : [];
  } catch {
    return [];
  }
}

export function addSearchHistoryItem(symbol) {
  const searchedAt = new Date().toISOString();
  const existingItems = getSearchHistory().filter((item) => item.symbol !== symbol);
  const nextItems = [{ symbol, searchedAt }, ...existingItems].slice(0, MAX_SEARCH_HISTORY_ITEMS);
  saveSearchHistory(nextItems);
  return nextItems;
}

export function clearSearchHistory() {
  saveSearchHistory([]);
}

function saveSearchHistory(items) {
  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
}

function isValidHistoryItem(item) {
  return Boolean(item && typeof item.symbol === 'string' && typeof item.searchedAt === 'string');
}
