import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ANALYSIS_ARCHIVE_CHANGED_EVENT, getSavedAnalyses } from '../services/analysisArchiveStorage';
import { FAVORITES_CHANGED_EVENT, getFavoriteTickers, removeFavoriteTicker } from '../services/favoritesStorage';

export default function Portfolio() {
  const [favoriteTickers, setFavoriteTickers] = useState(() => getFavoriteTickers());
  const [savedAnalyses, setSavedAnalyses] = useState(() => getSavedAnalyses());

  useEffect(() => {
    const handleLocalDataChanged = () => {
      setFavoriteTickers(getFavoriteTickers());
      setSavedAnalyses(getSavedAnalyses());
    };

    window.addEventListener(FAVORITES_CHANGED_EVENT, handleLocalDataChanged);
    window.addEventListener(ANALYSIS_ARCHIVE_CHANGED_EVENT, handleLocalDataChanged);
    window.addEventListener('storage', handleLocalDataChanged);

    return () => {
      window.removeEventListener(FAVORITES_CHANGED_EVENT, handleLocalDataChanged);
      window.removeEventListener(ANALYSIS_ARCHIVE_CHANGED_EVENT, handleLocalDataChanged);
      window.removeEventListener('storage', handleLocalDataChanged);
    };
  }, []);

  const handleRemove = (symbol) => {
    removeFavoriteTicker(symbol);
    setFavoriteTickers(getFavoriteTickers());
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg">
      <header className="flex flex-col lg:flex-row gap-md lg:items-end lg:justify-between pb-sm border-b border-outline-variant/20">
        <div>
          <p className="font-label-sm text-label-sm text-primary uppercase">AISNA Watchlist</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">Favorite Tickers</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Saved stock tickers for quick access to news analysis.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm"
          to="/analysis"
        >
          <span className="material-symbols-outlined">add</span>
          Add Ticker
        </Link>
      </header>

      {favoriteTickers.length === 0 ? (
        <section className="glass-panel rounded-xl p-lg flex items-center gap-md text-on-surface-variant">
          <span className="material-symbols-outlined text-outline">star</span>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">No Favorites Yet</h2>
            <p className="font-body-md text-body-md">Search a ticker in Analysis and save it to build your watchlist.</p>
          </div>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
          {favoriteTickers.map((symbol) => (
            <article className="glass-panel rounded-xl p-lg flex flex-col gap-md" key={symbol}>
              <div className="flex items-center justify-between gap-md">
                <div>
                  <div className="font-data-mono text-data-mono text-primary">{symbol}</div>
                  <h2 className="font-headline-md text-headline-md text-on-surface mt-1">Saved Ticker</h2>
                </div>
                <button
                  className="text-on-surface-variant hover:text-error transition-colors"
                  type="button"
                  onClick={() => handleRemove(symbol)}
                  aria-label={`Remove ${symbol} from favorites`}
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>

              <Link
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm"
                to={`/analysis?symbol=${encodeURIComponent(symbol)}`}
              >
                <span className="material-symbols-outlined">open_in_new</span>
                Open Analysis
              </Link>
            </article>
          ))}
        </section>
      )}

      <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">history</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Cached Analyses</h2>
        </div>
        {savedAnalyses.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Run an analysis to save a report for quick review.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {savedAnalyses.slice(0, 6).map((record) => (
              <article className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex flex-col gap-sm" key={record.id}>
                <div className="font-data-mono text-data-mono text-primary">{record.symbol}</div>
                <h3 className="font-label-sm text-label-sm text-on-surface">
                  {record.report?.summary?.short_summary || 'Saved analysis'}
                </h3>
                <p className="font-data-mono text-[11px] text-on-surface-variant">
                  {record.articleCount} articles - {formatDateTime(record.createdAt)}
                </p>
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
      </section>
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
