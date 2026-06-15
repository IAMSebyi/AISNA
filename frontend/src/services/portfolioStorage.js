const PORTFOLIO_KEY = 'aisna.portfolio.transactions';
const PORTFOLIO_CHANGED_EVENT = 'aisna:portfolio-changed';

export function getTransactions() {
  try {
    const storedValue = window.localStorage.getItem(PORTFOLIO_KEY);
    const parsedValue = JSON.parse(storedValue || '[]');
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

export function addTransaction(transaction) {
  const transactions = getTransactions();
  const newTx = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    symbol: String(transaction.symbol || '').trim().toUpperCase(),
    shares: parseFloat(transaction.shares) || 0,
    price: parseFloat(transaction.price) || 0,
    date: transaction.date || new Date().toISOString().split('T')[0],
  };

  if (!newTx.symbol || newTx.shares <= 0 || newTx.price < 0) {
    throw new Error('Invalid transaction data.');
  }

  const nextTransactions = [...transactions, newTx];
  window.localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(nextTransactions));
  window.dispatchEvent(new Event(PORTFOLIO_CHANGED_EVENT));
  return newTx;
}

export function deleteTransaction(id) {
  const transactions = getTransactions();
  const nextTransactions = transactions.filter((tx) => tx.id !== id);
  window.localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(nextTransactions));
  window.dispatchEvent(new Event(PORTFOLIO_CHANGED_EVENT));
}

export { PORTFOLIO_CHANGED_EVENT };
