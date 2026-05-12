import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ANALYSIS_ARCHIVE_CHANGED_EVENT, getSavedAnalyses } from '../services/analysisArchiveStorage';
import { FAVORITES_CHANGED_EVENT, getFavoriteTickers } from '../services/favoritesStorage';
import { getSearchHistory } from '../services/searchHistoryStorage';
import { fetchStockNews, isValidStockSymbol, normalizeStockSymbol } from '../services/stocksApi';

const MAG7_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'];

export default function Terminal() {
  const navigate = useNavigate();
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchError, setSearchError] = useState('');
  const [savedAnalyses, setSavedAnalyses] = useState(() => getSavedAnalyses());
  const [favoriteTickers, setFavoriteTickers] = useState(() => getFavoriteTickers());
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory());
  const [featuredArticleState, setFeaturedArticleState] = useState({
    article: null,
    error: '',
    ticker: '',
  });
  const featuredTicker = useMemo(() => {
    const candidateTickers = favoriteTickers.length > 0 ? favoriteTickers : MAG7_TICKERS;
    return pickStableTicker(candidateTickers);
  }, [favoriteTickers]);

  useEffect(() => {
    const refreshLocalData = () => {
      setSavedAnalyses(getSavedAnalyses());
      setFavoriteTickers(getFavoriteTickers());
      setSearchHistory(getSearchHistory());
    };

    window.addEventListener(ANALYSIS_ARCHIVE_CHANGED_EVENT, refreshLocalData);
    window.addEventListener(FAVORITES_CHANGED_EVENT, refreshLocalData);
    window.addEventListener('storage', refreshLocalData);

    return () => {
      window.removeEventListener(ANALYSIS_ARCHIVE_CHANGED_EVENT, refreshLocalData);
      window.removeEventListener(FAVORITES_CHANGED_EVENT, refreshLocalData);
      window.removeEventListener('storage', refreshLocalData);
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    fetchStockNews(featuredTicker, 1)
      .then((articles) => {
        if (isCancelled) return;
        setFeaturedArticleState({
          article: articles[0] || null,
          error: articles[0] ? '' : `No recent article found for ${featuredTicker}.`,
          ticker: featuredTicker,
        });
      })
      .catch((error) => {
        if (isCancelled) return;
        setFeaturedArticleState({
          article: null,
          error: error.message || `Could not load latest article for ${featuredTicker}.`,
          ticker: featuredTicker,
        });
      });

    return () => {
      isCancelled = true;
    };
  }, [featuredTicker]);

  const handleSearch = (event) => {
    event.preventDefault();
    const normalizedSymbol = normalizeStockSymbol(searchSymbol);

    if (!isValidStockSymbol(normalizedSymbol)) {
      setSearchError('Enter a valid ticker using letters, numbers, dots, or hyphens.');
      return;
    }

    navigate(`/analysis?symbol=${encodeURIComponent(normalizedSymbol)}`);
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg w-full">
      <header className="flex flex-col lg:flex-row gap-md lg:items-end lg:justify-between pb-sm border-b border-outline-variant/20">
        <div>
          <p className="font-label-sm text-label-sm text-primary uppercase">AISNA Dashboard</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">AI Stock News Analyzer</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Search a ticker, fetch live Alpha Vantage news, generate a summary, run sentiment analysis, and keep the report cached for the demo.
          </p>
        </div>

        <form className="w-full lg:w-96 flex flex-col gap-2" onSubmit={handleSearch}>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-outline">search</span>
            </div>
            <input
              autoFocus
              className={`block w-full pl-10 pr-12 py-3 border rounded-lg leading-5 bg-surface-container-highest text-on-surface placeholder-outline focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary font-data-mono text-data-mono transition-colors ${searchError ? 'border-error/70' : 'border-outline/30'}`}
              maxLength={12}
              onChange={(event) => {
                setSearchSymbol(normalizeStockSymbol(event.target.value));
                setSearchError('');
              }}
              placeholder="ENTER TICKER"
              type="text"
              value={searchSymbol}
            />
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary"
              type="submit"
              aria-label="Search ticker"
            >
              <span className="material-symbols-outlined">keyboard_return</span>
            </button>
          </div>
          {searchError && <span className="font-label-sm text-label-sm text-error">{searchError}</span>}
        </form>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
        <MetricCard icon="history" label="Saved Reports" value={savedAnalyses.length} />
        <MetricCard icon="star" label="Favorite Tickers" value={favoriteTickers.length} />
        <MetricCard icon="manage_search" label="Recent Searches" value={searchHistory.length} />
        <MetricCard icon="newspaper" label="Featured Ticker" value={featuredTicker || '-'} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        <div className="xl:col-span-7 glass-panel rounded-xl p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between gap-md">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">history</span>
              <h2 className="font-headline-md text-headline-md text-on-surface">Saved Analyses</h2>
            </div>
            <Link
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm"
              to="/analysis"
            >
              <span className="material-symbols-outlined text-base">add_chart</span>
              New
            </Link>
          </div>

          {savedAnalyses.length === 0 ? (
            <EmptyState
              icon="insights"
              title="No cached reports"
              text="Run an analysis once and it will be saved locally for reuse during the demo."
            />
          ) : (
            <div className="flex flex-col gap-sm">
              {savedAnalyses.slice(0, 5).map((record) => (
                <article className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex flex-col gap-sm" key={record.id}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-sm">
                    <div>
                      <div className="font-data-mono text-data-mono text-primary">{record.symbol}</div>
                      <h3 className="font-label-sm text-label-sm text-on-surface mt-1">
                        {record.report?.summary?.short_summary || 'Saved analysis'}
                      </h3>
                    </div>
                    <span className="font-data-mono text-[11px] text-on-surface-variant">{formatDateTime(record.createdAt)}</span>
                  </div>
                  <div className="flex flex-wrap gap-sm">
                    <span className="rounded border border-outline-variant/30 px-2 py-1 font-data-mono text-[11px] text-on-surface-variant">
                      {record.articleCount} articles
                    </span>
                    <span className="rounded border border-outline-variant/30 px-2 py-1 font-data-mono text-[11px] text-on-surface-variant">
                      {record.report?.recommendation?.action || 'Hold'}
                    </span>
                  </div>
                  <Link
                    className="inline-flex w-fit items-center gap-1 text-primary hover:text-primary-fixed font-label-sm text-label-sm"
                    to={`/analysis?symbol=${encodeURIComponent(record.symbol)}`}
                  >
                    Open ticker
                    <span className="material-symbols-outlined text-base">open_in_new</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-5 flex flex-col gap-md">
          <Panel title="Favorite Tickers" icon="star">
            {favoriteTickers.length === 0 ? (
              <p className="font-body-md text-body-md text-on-surface-variant">Save tickers from the Analysis page.</p>
            ) : (
              <div className="flex flex-wrap gap-sm">
                {favoriteTickers.map((symbol) => (
                  <Link
                    className="rounded-lg border border-outline-variant/30 bg-surface-container/60 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-data-mono text-data-mono"
                    to={`/analysis?symbol=${encodeURIComponent(symbol)}`}
                    key={symbol}
                  >
                    {symbol}
                  </Link>
                ))}
              </div>
            )}
          </Panel>

          <LatestArticlePanel
            article={featuredArticleState.article}
            error={featuredArticleState.error}
            isLoading={featuredArticleState.ticker !== featuredTicker}
            symbol={featuredTicker}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value }) {
  return (
    <div className="glass-panel rounded-xl p-md flex items-center gap-3">
      <span className="material-symbols-outlined text-primary">{icon}</span>
      <div>
        <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">{label}</div>
        <div className="font-headline-md text-headline-md text-on-surface mt-1">{value}</div>
      </div>
    </div>
  );
}

function Panel({ children, icon, title }) {
  return (
    <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-primary">{icon}</span>
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function LatestArticlePanel({ article, error, isLoading, symbol }) {
  return (
    <Panel title="Latest Financial Article" icon="newspaper">
      {isLoading ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          Loading latest article for {symbol}.
        </p>
      ) : error ? (
        <div className="rounded-lg border border-tertiary/40 bg-tertiary-container/10 p-md text-tertiary-fixed font-body-md text-body-md">
          {error}
        </div>
      ) : article ? (
        <article className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex flex-col gap-sm">
          <div className="flex items-start justify-between gap-sm">
            <div className="min-w-0">
              <div className="font-data-mono text-[11px] text-on-surface-variant">
                {symbol} - {article.source || 'Unknown source'}{article.published_at ? ` - ${article.published_at}` : ''}
              </div>
              <h3 className="font-label-sm text-label-sm text-on-surface mt-1">{article.title}</h3>
            </div>
            {article.sentiment && (
              <span className="shrink-0 rounded border border-outline-variant/30 px-2 py-1 font-data-mono text-[11px] text-on-surface-variant uppercase">
                {article.sentiment}
              </span>
            )}
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {article.description || article.content || 'No article summary available.'}
          </p>
          <div className="flex flex-wrap gap-sm">
            <Link
              className="inline-flex items-center gap-1 text-primary hover:text-primary-fixed font-label-sm text-label-sm"
              to={`/analysis?symbol=${encodeURIComponent(symbol)}`}
            >
              Analyze {symbol}
              <span className="material-symbols-outlined text-base">open_in_new</span>
            </Link>
            {article.url && (
              <a
                className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm"
                href={article.url}
                target="_blank"
                rel="noreferrer"
              >
                Source
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            )}
          </div>
        </article>
      ) : (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No article available for {symbol}.
        </p>
      )}
    </Panel>
  );
}

function EmptyState({ icon, title, text }) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex items-center gap-md text-on-surface-variant">
      <span className="material-symbols-outlined text-outline">{icon}</span>
      <div>
        <h3 className="font-label-sm text-label-sm text-on-surface">{title}</h3>
        <p className="font-body-md text-body-md">{text}</p>
      </div>
    </div>
  );
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'recent';
  }
  return date.toLocaleString();
}

function pickStableTicker(tickers) {
  const cleanTickers = tickers.filter(Boolean);
  if (cleanTickers.length === 0) {
    return MAG7_TICKERS[0];
  }

  const dayIndex = Math.floor(Date.now() / 86400000) % cleanTickers.length;
  return cleanTickers[dayIndex];
}
