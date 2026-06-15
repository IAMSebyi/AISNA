import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getTransactions, addTransaction, deleteTransaction, PORTFOLIO_CHANGED_EVENT } from '../services/portfolioStorage';
import { getSavedAnalyses, ANALYSIS_ARCHIVE_CHANGED_EVENT } from '../services/analysisArchiveStorage';
import { getFavoriteTickers, FAVORITES_CHANGED_EVENT, removeFavoriteTicker } from '../services/favoritesStorage';
import { fetchMarketSnapshot, isValidStockSymbol, normalizeStockSymbol } from '../services/stocksApi';
import { analyzePortfolioReport } from '../services/analysisApi';

const ADVISOR_REPORT_KEY = 'aisna.portfolio.advisorReport';

export default function Portfolio() {
  // Watchlist and cache states
  const [favoriteTickers, setFavoriteTickers] = useState(() => getFavoriteTickers());
  const [savedAnalyses, setSavedAnalyses] = useState(() => getSavedAnalyses());

  // Portfolio Simulator states
  const [transactions, setTransactions] = useState(() => getTransactions());
  const [prices, setPrices] = useState({});
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Form states
  const [formSymbol, setFormSymbol] = useState('');
  const [formShares, setFormShares] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formError, setFormError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // AI Advisor states
  const [advisorReport, setAdvisorReport] = useState(() => {
    try {
      const stored = window.localStorage.getItem(ADVISOR_REPORT_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [advisorError, setAdvisorError] = useState('');

  // Listen to storage events
  useEffect(() => {
    const handleLocalDataChanged = () => {
      setFavoriteTickers(getFavoriteTickers());
      setSavedAnalyses(getSavedAnalyses());
      setTransactions(getTransactions());
    };

    window.addEventListener(FAVORITES_CHANGED_EVENT, handleLocalDataChanged);
    window.addEventListener(ANALYSIS_ARCHIVE_CHANGED_EVENT, handleLocalDataChanged);
    window.addEventListener(PORTFOLIO_CHANGED_EVENT, handleLocalDataChanged);
    window.addEventListener('storage', handleLocalDataChanged);

    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleLocalDataChanged);
      window.removeEventListener(ANALYSIS_ARCHIVE_CHANGED_EVENT, handleLocalDataChanged);
      window.removeEventListener(PORTFOLIO_CHANGED_EVENT, handleLocalDataChanged);
      window.removeEventListener('storage', handleLocalDataChanged);
    };
  }, []);

  // Fetch prices for unique transaction symbols
  useEffect(() => {
    const uniqueSymbols = [...new Set(transactions.map((tx) => tx.symbol))];
    let isCancelled = false;

    async function loadPrices() {
      if (uniqueSymbols.length === 0) {
        setPrices({});
        return;
      }

      setIsFetchingPrices(true);
      setPriceError('');
      try {
        const snapshot = await fetchMarketSnapshot(uniqueSymbols);
        if (!isCancelled) {
          const priceMap = {};
          snapshot.forEach((item) => {
            priceMap[item.symbol] = item.price;
          });
          setPrices(priceMap);
        }
      } catch {
        if (!isCancelled) {
          setPriceError('Failed to fetch live stock prices.');
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingPrices(false);
        }
      }
    }

    loadPrices();
    return () => {
      isCancelled = true;
    };
  }, [transactions, refreshTrigger]);

  // Aggregate transactions into holdings
  const holdings = useMemo(() => {
    const map = {};
    transactions.forEach((tx) => {
      const sym = tx.symbol;
      if (!map[sym]) {
        map[sym] = { symbol: sym, shares: 0, totalCost: 0, transactionsList: [] };
      }
      map[sym].shares += tx.shares;
      map[sym].totalCost += tx.shares * tx.price;
      map[sym].transactionsList.push(tx);
    });

    return Object.values(map).map((h) => {
      const averagePrice = h.shares > 0 ? h.totalCost / h.shares : 0;
      const currentPrice = prices[h.symbol] || averagePrice;
      const marketValue = h.shares * currentPrice;
      const gainLoss = marketValue - h.totalCost;
      const gainLossPercent = h.totalCost > 0 ? (gainLoss / h.totalCost) * 100 : 0;

      return {
        ...h,
        averagePrice,
        currentPrice,
        marketValue,
        gainLoss,
        gainLossPercent,
      };
    });
  }, [transactions, prices]);

  // Calculate overall metrics
  const { totalCost, totalValue, totalReturn, totalReturnPercent } = useMemo(() => {
    let cost = 0;
    let val = 0;
    holdings.forEach((h) => {
      cost += h.totalCost;
      val += h.marketValue;
    });
    const ret = val - cost;
    const retPercent = cost > 0 ? (ret / cost) * 100 : 0;

    return {
      totalCost: cost,
      totalValue: val,
      totalReturn: ret,
      totalReturnPercent: retPercent,
    };
  }, [holdings]);

  // Form handlers
  const handleAddTransaction = async (event) => {
    event.preventDefault();
    setFormError('');
    setIsAdding(true);

    const normSymbol = normalizeStockSymbol(formSymbol);
    if (!isValidStockSymbol(normSymbol)) {
      setFormError('Invalid ticker symbol format.');
      setIsAdding(false);
      return;
    }

    const shares = parseFloat(formShares);
    if (Number.isNaN(shares) || shares <= 0) {
      setFormError('Shares quantity must be greater than 0.');
      setIsAdding(false);
      return;
    }

    const price = parseFloat(formPrice);
    if (Number.isNaN(price) || price < 0) {
      setFormError('Price must be greater than or equal to 0.');
      setIsAdding(false);
      return;
    }

    try {
      // Query backend to verify if the symbol is a valid/real ticker
      const snapshot = await fetchMarketSnapshot([normSymbol]);
      if (!snapshot || snapshot.length === 0) {
        setFormError(`Ticker "${normSymbol}" is not active or could not be found.`);
        setIsAdding(false);
        return;
      }

      addTransaction({
        symbol: normSymbol,
        shares,
        price,
        date: formDate,
      });
      // Reset inputs
      setFormSymbol('');
      setFormShares('');
      setFormPrice('');
      setFormDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      setFormError(err.message || 'Failed to verify ticker or record transaction.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteTransaction = (id) => {
    deleteTransaction(id);
  };

  // AI Advisor Handler
  const handleGenerateAdvisorReport = async () => {
    if (holdings.length === 0) {
      setAdvisorError('Add at least one transaction to analyze portfolio health.');
      return;
    }

    setIsAnalyzing(true);
    setAdvisorError('');
    try {
      const assetsPayload = holdings.map((h) => ({
        symbol: h.symbol,
        shares: h.shares,
        average_price: h.averagePrice,
        current_price: h.currentPrice,
      }));

      const report = await analyzePortfolioReport({ assets: assetsPayload });
      window.localStorage.setItem(ADVISOR_REPORT_KEY, JSON.stringify(report));
      setAdvisorReport(report);
    } catch (err) {
      setAdvisorError(err.message || 'Failed to generate advisory report.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearAdvisorReport = () => {
    window.localStorage.removeItem(ADVISOR_REPORT_KEY);
    setAdvisorReport(null);
  };

  const handleRemoveFavorite = (symbol) => {
    removeFavoriteTicker(symbol);
    setFavoriteTickers(getFavoriteTickers());
  };

  const getSentimentRiskColor = (risk) => {
    const r = String(risk || '').toLowerCase();
    if (r === 'low') return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30';
    if (r === 'high') return 'text-red-300 bg-red-400/10 border-red-400/30';
    return 'text-sky-200 bg-sky-400/10 border-sky-400/30';
  };

  const getScoreColor = (score) => {
    if (score >= 75) return '#10b981'; // Green
    if (score >= 45) return '#eab308'; // Yellow
    return '#ef4444'; // Red
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg w-full">
      <header className="flex flex-col lg:flex-row gap-md lg:items-end lg:justify-between pb-sm border-b border-outline-variant/20">
        <div>
          <p className="font-label-sm text-label-sm text-primary uppercase">AISNA Portfolio</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">Portfolio Simulator</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Simulate stock purchases, monitor live values with real price snapshots, and generate AI-driven diversification and risk advisory assessments.
          </p>
        </div>
      </header>

      {/* Portfolio Metrics Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md">
        <MetricCard icon="wallet" label="Portfolio Value" value={`$${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <MetricCard icon="payments" label="Invested Capital" value={`$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <div className="glass-panel rounded-xl p-md flex items-center gap-3">
          <span className={`material-symbols-outlined ${totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalReturn >= 0 ? 'trending_up' : 'trending_down'}
          </span>
          <div>
            <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">Total return</div>
            <div className={`font-headline-md text-headline-md mt-1 ${totalReturn >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {totalReturn >= 0 ? '+' : ''}${totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
        <MetricCard
          icon="percent"
          label="Return Percentage"
          value={`${totalReturnPercent >= 0 ? '+' : ''}${totalReturnPercent.toFixed(2)}%`}
          valueClass={totalReturnPercent >= 0 ? 'text-emerald-300' : 'text-red-300'}
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        {/* Left column: Holdings and Transactions */}
        <div className="xl:col-span-7 flex flex-col gap-md">
          {/* Holdings summary table */}
          <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">Holdings Summary</h2>
              </div>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-outline-variant/40 hover:border-primary text-on-surface-variant hover:text-primary transition-colors cursor-pointer disabled:opacity-50"
                onClick={() => setRefreshTrigger((c) => c + 1)}
                disabled={isFetchingPrices || holdings.length === 0}
                title="Refresh Prices"
                type="button"
              >
                <span className={`material-symbols-outlined text-base ${isFetchingPrices ? 'animate-spin' : ''}`}>
                  refresh
                </span>
              </button>
            </div>

            {priceError && (
              <div className="rounded-lg border border-error/30 bg-error-container/20 p-sm text-error font-body-md text-body-md flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">error</span>
                <span>{priceError}</span>
              </div>
            )}

            {holdings.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant py-md text-center border border-dashed border-outline-variant/20 rounded-lg">
                No stock holdings recorded. Use the form below to add a transaction.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/30 text-on-surface-variant font-data-mono text-xs">
                      <th className="py-3 pr-2">Asset</th>
                      <th className="py-3 px-2 text-right">Shares</th>
                      <th className="py-3 px-2 text-right">Avg Cost</th>
                      <th className="py-3 px-2 text-right">Live Price</th>
                      <th className="py-3 px-2 text-right">Market Value</th>
                      <th className="py-3 pl-2 text-right">Gain/Loss</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((h) => (
                      <tr className="border-b border-outline-variant/10 hover:bg-surface-container/30 transition-colors" key={h.symbol}>
                        <td className="py-3 pr-2">
                          <Link className="font-data-mono text-primary font-bold hover:underline" to={`/analysis?symbol=${encodeURIComponent(h.symbol)}`}>
                            {h.symbol}
                          </Link>
                        </td>
                        <td className="py-3 px-2 text-right font-data-mono">{h.shares}</td>
                        <td className="py-3 px-2 text-right font-data-mono">${h.averagePrice.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-data-mono">${h.currentPrice.toFixed(2)}</td>
                        <td className="py-3 px-2 text-right font-data-mono font-bold">${h.marketValue.toFixed(2)}</td>
                        <td className={`py-3 pl-2 text-right font-data-mono font-bold ${h.gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {h.gainLoss >= 0 ? '+' : ''}${h.gainLoss.toFixed(2)}
                          <div className="text-[10px] opacity-80">({h.gainLossPercent >= 0 ? '+' : ''}{h.gainLossPercent.toFixed(1)}%)</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Add transaction form */}
          <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">add_card</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Add Transaction</h2>
            </div>

            <form className="flex flex-col gap-md" onSubmit={handleAddTransaction}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-md">
                <label className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Ticker</span>
                  <input
                    className="rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-on-surface outline-none focus:border-primary font-data-mono"
                    maxLength={12}
                    onChange={(event) => setFormSymbol(normalizeStockSymbol(event.target.value))}
                    placeholder="e.g. AAPL"
                    type="text"
                    value={formSymbol}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Shares</span>
                  <input
                    className="rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-on-surface outline-none focus:border-primary font-data-mono"
                    min="0.0001"
                    step="any"
                    onChange={(event) => setFormShares(event.target.value)}
                    placeholder="Quantity"
                    type="number"
                    value={formShares}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Buy Price ($)</span>
                  <input
                    className="rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-on-surface outline-none focus:border-primary font-data-mono"
                    min="0"
                    step="any"
                    onChange={(event) => setFormPrice(event.target.value)}
                    placeholder="Price per share"
                    type="number"
                    value={formPrice}
                    required
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Date</span>
                  <input
                    className="rounded-lg border border-outline-variant/40 bg-surface-container-highest px-3 py-2 text-on-surface outline-none focus:border-primary font-data-mono"
                    onChange={(event) => setFormDate(event.target.value)}
                    type="date"
                    value={formDate}
                    required
                  />
                </label>
              </div>

              <div className="flex items-center justify-between gap-md mt-sm">
                {formError && <span className="font-label-sm text-label-sm text-error">{formError}</span>}
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm cursor-pointer ml-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isAdding}
                >
                  <span className={`material-symbols-outlined text-base ${isAdding ? 'animate-spin' : ''}`}>
                    {isAdding ? 'sync' : 'add'}
                  </span>
                  {isAdding ? 'Verifying Ticker...' : 'Record buy'}
                </button>
              </div>
            </form>
          </section>

          {/* Transaction history list */}
          <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">receipt_long</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Transaction Log</h2>
            </div>

            {transactions.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">No transaction history recorded yet.</p>
            ) : (
              <div className="flex flex-col gap-sm max-h-80 overflow-y-auto pr-xs">
                {transactions.map((tx) => (
                  <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex items-center justify-between gap-md" key={tx.id}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-data-mono text-data-mono text-primary font-bold">{tx.symbol}</span>
                        <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.5 font-data-mono text-[10px] text-primary uppercase">
                          Buy
                        </span>
                      </div>
                      <div className="font-data-mono text-[11px] text-on-surface-variant mt-1">
                        {tx.shares} shares @ ${tx.price.toFixed(2)} on {tx.date}
                      </div>
                    </div>
                    <button
                      className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                      onClick={() => handleDeleteTransaction(tx.id)}
                      title="Delete transaction"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column: AI Advisor and Lists */}
        <div className="xl:col-span-5 flex flex-col gap-md">
          {/* AI Advisor Panel */}
          <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">psychology</span>
                <h2 className="font-headline-md text-headline-md text-on-surface">AI Portfolio Advisor</h2>
              </div>
              {advisorReport && (
                <button
                  className="text-on-surface-variant hover:text-error transition-colors cursor-pointer font-data-mono text-xs"
                  onClick={handleClearAdvisorReport}
                  type="button"
                >
                  Reset
                </button>
              )}
            </div>

            {advisorError && (
              <div className="rounded-lg border border-error/30 bg-error-container/20 p-md text-error font-body-md text-body-md">
                {advisorError}
              </div>
            )}

            {!advisorReport ? (
              <div className="flex flex-col gap-md items-center py-lg text-center">
                <p className="font-body-md text-body-md text-on-surface-variant max-w-[380px]">
                  Run a complete health check to analyze diversification scores, collective news sentiment, and strategic investment rebalancing notes.
                </p>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  onClick={handleGenerateAdvisorReport}
                  disabled={isAnalyzing || holdings.length === 0}
                  type="button"
                >
                  <span className={`material-symbols-outlined text-base ${isAnalyzing ? 'animate-spin' : ''}`}>
                    {isAnalyzing ? 'sync' : 'bolt'}
                  </span>
                  {isAnalyzing ? 'Analyzing Portfolio' : 'Generate Advisor Report'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {/* Diversification Score progress bar */}
                <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md">
                  <div className="flex items-center justify-between gap-md mb-xs">
                    <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Diversification Score</span>
                    <span className="font-data-mono text-data-mono font-bold" style={{ color: getScoreColor(advisorReport.diversification_score) }}>
                      {advisorReport.diversification_score}/100
                    </span>
                  </div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${advisorReport.diversification_score}%`,
                        backgroundColor: getScoreColor(advisorReport.diversification_score),
                      }}
                    />
                  </div>
                </div>

                {/* Sentiment Risk Badge */}
                <div className="flex items-center justify-between gap-md rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Collective Sentiment Risk</span>
                  <span className={`rounded px-2.5 py-1 font-label-sm text-label-sm uppercase border ${getSentimentRiskColor(advisorReport.sentiment_risk)}`}>
                    {advisorReport.sentiment_risk} Risk
                  </span>
                </div>

                {/* Report Summary */}
                <p className="font-body-md text-body-md text-on-surface leading-relaxed border-b border-outline-variant/10 pb-md">
                  {advisorReport.summary}
                </p>

                {/* Advisory Notes List */}
                <div className="flex flex-col gap-sm">
                  <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Strategic Advisory Notes</span>
                  {advisorReport.advisory_notes.map((note, idx) => (
                    <div className="flex gap-2 text-on-surface-variant font-body-md text-body-md" key={idx}>
                      <span className="material-symbols-outlined text-primary text-base mt-1 flex-shrink-0">campaign</span>
                      <span className="flex-1">{note}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Favorite Tickers Panel (Watchlist) */}
          <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">star</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Watchlist Favorites</h2>
            </div>
            {favoriteTickers.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Save tickers from the Analysis page.</p>
            ) : (
              <div className="flex flex-wrap gap-sm">
                {favoriteTickers.map((symbol) => (
                  <div className="flex items-center gap-1 rounded-lg border border-outline-variant/30 bg-surface-container/60 px-3 py-1.5" key={symbol}>
                    <Link className="font-data-mono text-data-mono hover:underline hover:text-primary text-on-surface" to={`/analysis?symbol=${encodeURIComponent(symbol)}`}>
                      {symbol}
                    </Link>
                    <button
                      className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                      onClick={() => handleRemoveFavorite(symbol)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Cached Analyses */}
          <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">history</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Recent Reports</h2>
            </div>
            {savedAnalyses.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">
                Run an analysis in News Analysis to save a report.
              </p>
            ) : (
              <div className="flex flex-col gap-sm">
                {savedAnalyses.slice(0, 3).map((record) => (
                  <article className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-sm" key={record.id}>
                    <div className="flex items-center justify-between gap-sm">
                      <Link className="font-data-mono text-data-mono text-primary font-bold hover:underline" to={`/analysis?symbol=${encodeURIComponent(record.symbol)}`}>
                        {record.symbol}
                      </Link>
                      <span className="font-data-mono text-[10px] text-on-surface-variant">
                        {record.report?.recommendation?.action || 'HOLD'}
                      </span>
                    </div>
                    <div className="font-data-mono text-[10px] text-on-surface-variant mt-1 truncate">
                      {record.report?.summary?.short_summary || 'Saved analysis'}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, valueClass = 'text-on-surface' }) {
  return (
    <div className="glass-panel rounded-xl p-md flex items-center gap-3">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <div>
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">{label}</div>
        <div className={`font-headline-md text-headline-md mt-1 ${valueClass}`}>{value}</div>
      </div>
    </div>
  );
}
