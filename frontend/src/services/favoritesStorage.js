const FAVORITES_KEY = 'aisna.favoriteTickers';
const FAVORITES_CHANGED_EVENT = 'aisna:favorites-changed';

export function getFavoriteTickers() {
  try {
    const storedValue = window.localStorage.getItem(FAVORITES_KEY);
    const parsedValue = JSON.parse(storedValue || '[]');
    return Array.isArray(parsedValue) ? parsedValue.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function isFavoriteTicker(symbol) {
  return getFavoriteTickers().includes(symbol);
}

export function addFavoriteTicker(symbol) {
  const favorites = getFavoriteTickers();
  if (!favorites.includes(symbol)) {
    saveFavoriteTickers([...favorites, symbol].sort());
  }
}

export function removeFavoriteTicker(symbol) {
  saveFavoriteTickers(getFavoriteTickers().filter((favorite) => favorite !== symbol));
}

export function toggleFavoriteTicker(symbol) {
  if (isFavoriteTicker(symbol)) {
    removeFavoriteTicker(symbol);
    return false;
  }

  addFavoriteTicker(symbol);
  return true;
}

function saveFavoriteTickers(favorites) {
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export { FAVORITES_CHANGED_EVENT };
