import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { analyzeNewsSentiment, summarizeNews } from '../services/analysisApi';
import { isFavoriteTicker, toggleFavoriteTicker } from '../services/favoritesStorage';
import { fetchStockNews, isValidStockSymbol, normalizeStockSymbol } from '../services/stocksApi';

const initialArticles = [
  {
    title: 'Apple reports stronger iPhone demand',
    source: 'Reuters',
    url: 'https://example.com/apple-demand',
    published_at: '2026-05-11',
    description: 'Apple demand appears stronger than expected.',
    content: 'Analysts reported increased demand for recent iPhone models and resilient services revenue.',
  },
  {
    title: 'Apple services revenue grows despite hardware concerns',
    source: 'Bloomberg',
    url: 'https://example.com/apple-services',
    published_at: '2026-05-11',
    description: 'Services revenue remains a bright spot.',
    content: "Apple's services segment continued to grow, helping offset concerns about slower hardware upgrade cycles.",
  },
];

const sentimentStyles = {
  positive: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  negative: 'text-red-300 bg-red-400/10 border-red-400/30',
  neutral: 'text-sky-200 bg-sky-400/10 border-sky-400/30',
};

const recommendationStyles = {
  Buy: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30',
  Hold: 'text-sky-200 bg-sky-400/10 border-sky-400/30',
  Sell: 'text-red-300 bg-red-400/10 border-red-400/30',
};

function emptyArticle() {
  return {
    title: '',
    source: '',
    url: '',
    published_at: '',
    description: '',
    content: '',
  };
}

export default function Analysis() {
  const [searchParams] = useSearchParams();
  const initialSymbol = normalizeStockSymbol(searchParams.get('symbol') || 'AAPL');
  const [symbol, setSymbol] = useState(initialSymbol);
  const [articles, setArticles] = useState(initialArticles);
  const [summary, setSummary] = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [error, setError] = useState('');
  const [newsNotice, setNewsNotice] = useState('');
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState('');
  const [newsArticles, setNewsArticles] = useState([]);
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [, setFavoriteTickersVersion] = useState(0);

  const normalizedSymbol = normalizeStockSymbol(symbol);
  const symbolIsValid = isValidStockSymbol(symbol);
  const isCurrentTickerFavorite = symbolIsValid && isFavoriteTicker(normalizedSymbol);

  const canSubmit = useMemo(() => {
    return symbolIsValid && articles.some((article) => article.title.trim());
  }, [articles, symbolIsValid]);

  const updateArticle = (index, field, value) => {
    setArticles((current) =>
      current.map((article, articleIndex) =>
        articleIndex === index ? { ...article, [field]: value } : article,
      ),
    );
  };

  const addArticle = () => {
    setArticles((current) => [...current, emptyArticle()]);
  };

  const removeArticle = (index) => {
    setArticles((current) => current.filter((_, articleIndex) => articleIndex !== index));
  };

  const resetSample = () => {
    setArticles(initialArticles);
    setSymbol('AAPL');
    setSummary(null);
    setSentiment(null);
    setError('');
    setNewsNotice('');
    setLastFetchedSymbol('');
    setNewsArticles([]);
    setShowArticleEditor(false);
  };

  const handleFetchNews = async () => {
    if (!symbolIsValid) {
      setError('Enter a valid ticker using letters, numbers, dots, or hyphens.');
      return;
    }

    setIsFetchingNews(true);
    setError('');
    setNewsNotice('');
    setSummary(null);
    setSentiment(null);

    try {
      const fetchedArticles = await fetchStockNews(normalizedSymbol, 5);
      if (fetchedArticles.length === 0) {
        setNewsNotice('No news articles were found for this ticker.');
        setNewsArticles([]);
      } else {
        setNewsArticles(fetchedArticles);
        if (fetchedArticles.some((article) => article.source === 'Alpha Vantage Fallback')) {
          setNewsNotice('The news provider did not return live articles, so a fallback item is shown.');
        }
        setShowArticleEditor(false);
        setArticles(fetchedArticles.map(article => ({
          title: article.title || '',
          source: article.source || '',
          url: article.url || '',
          published_at: article.published_at || '',
          description: article.description || '',
          content: article.content || '',
        })));
        setLastFetchedSymbol(normalizedSymbol);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch news.');
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleToggleFavorite = () => {
    if (!symbolIsValid) {
      setError('Enter a valid ticker before saving it as a favorite.');
      return;
    }

    const isSaved = toggleFavoriteTicker(normalizedSymbol);
    setFavoriteTickersVersion((current) => current + 1);
    setNewsNotice(isSaved ? `${normalizedSymbol} was added to favorite tickers.` : `${normalizedSymbol} was removed from favorite tickers.`);
    setError('');
  };

  const runAnalysis = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setError('');
    setNewsNotice('');
    setSummary(null);
    setSentiment(null);

    const payload = {
      symbol: normalizedSymbol,
      articles: articles
        .filter((article) => article.title.trim())
        .map((article) => ({
          ...article,
          title: article.title.trim(),
          source: article.source.trim(),
          url: article.url.trim(),
          published_at: article.published_at.trim(),
          description: article.description.trim() || null,
          content: article.content.trim() || null,
        })),
      max_key_points: 5,
    };

    try {
      const [summaryResult, sentimentResult] = await Promise.all([
        summarizeNews(payload),
        analyzeNewsSentiment(payload),
      ]);

      setSummary(summaryResult);
      setSentiment(sentimentResult);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg w-full">
      <header className="flex flex-col lg:flex-row gap-md lg:items-end lg:justify-between pb-sm border-b border-outline-variant/20">
        <div>
          <p className="font-label-sm text-label-sm text-primary uppercase">AISNA Agent Console</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">News Analysis</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Run the summarizer and sentiment agents against the same set of news articles, then inspect the recommendation generated from sentiment evidence.
          </p>
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant font-data-mono text-data-mono">
          <span className="material-symbols-outlined text-primary">hub</span>
          <span>Backend: /api/v1/analysis</span>
        </div>
      </header>

      <form className="grid grid-cols-1 xl:grid-cols-12 gap-gutter" onSubmit={runAnalysis}>
        <section className="xl:col-span-5 flex flex-col gap-md">
          <div className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Input</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Search a ticker, fetch news, then send the article context to the agents.</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-label-sm text-label-sm"
                  type="button"
                  onClick={resetSample}
                >
                  <span className="material-symbols-outlined text-base">restart_alt</span>
                  Sample
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-primary hover:text-primary-fixed hover:border-primary transition-colors font-label-sm text-label-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  onClick={handleFetchNews}
                  disabled={isFetchingNews || !symbolIsValid}
                >
                  <span className={`material-symbols-outlined text-base ${isFetchingNews ? 'animate-spin' : ''}`}>{isFetchingNews ? 'sync' : 'search'}</span>
                  {isFetchingNews ? 'Searching...' : 'Search Ticker'}
                </button>
              </div>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Ticker</span>
              <div className="flex gap-2">
                <input
                  className={`min-w-0 flex-1 rounded-lg border bg-surface-container-highest px-4 py-3 font-data-mono text-data-mono text-on-surface outline-none focus:border-primary ${symbol && !symbolIsValid ? 'border-error/70' : 'border-outline-variant/40'}`}
                  maxLength={12}
                  value={symbol}
                  onChange={(event) => setSymbol(normalizeStockSymbol(event.target.value))}
                  placeholder="AAPL"
                />
                <button
                  className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isCurrentTickerFavorite ? 'border-primary/50 bg-primary/10 text-primary' : 'border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-primary'}`}
                  type="button"
                  onClick={handleToggleFavorite}
                  disabled={!symbolIsValid}
                  aria-label={isCurrentTickerFavorite ? `Remove ${normalizedSymbol} from favorite tickers` : `Save ${normalizedSymbol} as favorite ticker`}
                  title={isCurrentTickerFavorite ? 'Remove from favorites' : 'Save as favorite'}
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: isCurrentTickerFavorite ? "'FILL' 1" : "'FILL' 0" }}>star</span>
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 font-data-mono text-[11px] text-on-surface-variant">
                <span>{symbol && !symbolIsValid ? 'Use 1-12 letters, numbers, dots, or hyphens.' : 'Examples: AAPL, MSFT, BRK.B'}</span>
                {lastFetchedSymbol && <span>Loaded: {lastFetchedSymbol}</span>}
              </div>
            </label>
          </div>

          <div className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Agent Article Context</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">{articles.length} article{articles.length === 1 ? '' : 's'} ready for analysis.</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-label-sm text-label-sm"
                type="button"
                onClick={() => setShowArticleEditor((current) => !current)}
              >
                <span className="material-symbols-outlined text-base">{showArticleEditor ? 'expand_less' : 'edit_note'}</span>
                {showArticleEditor ? 'Hide Editor' : 'Edit Articles'}
              </button>
            </div>

            {showArticleEditor && (
              <div className="flex flex-col gap-md">
                {articles.map((article, index) => (
                  <article className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex flex-col gap-md" key={index}>
                    <div className="flex items-center justify-between gap-md">
                      <h3 className="font-label-sm text-label-sm text-on-surface">Article {index + 1}</h3>
                      {articles.length > 1 && (
                        <button
                          className="text-on-surface-variant hover:text-error transition-colors"
                          type="button"
                          onClick={() => removeArticle(index)}
                          aria-label={`Remove article ${index + 1}`}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      )}
                    </div>

                    <input
                      className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
                      value={article.title}
                      onChange={(event) => updateArticle(index, 'title', event.target.value)}
                      placeholder="Article title"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                      <input
                        className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
                        value={article.source}
                        onChange={(event) => updateArticle(index, 'source', event.target.value)}
                        placeholder="Source"
                      />
                      <input
                        className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
                        value={article.published_at}
                        onChange={(event) => updateArticle(index, 'published_at', event.target.value)}
                        placeholder="Published date"
                      />
                    </div>
                    <input
                      className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
                      value={article.url}
                      onChange={(event) => updateArticle(index, 'url', event.target.value)}
                      placeholder="URL"
                    />
                    <textarea
                      className="min-h-28 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
                      value={article.content}
                      onChange={(event) => updateArticle(index, 'content', event.target.value)}
                      placeholder="Article content"
                    />
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-sm">
            <button
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-outline-variant/40 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-label-sm text-label-sm"
              type="button"
              onClick={() => {
                addArticle();
                setShowArticleEditor(true);
              }}
            >
              <span className="material-symbols-outlined">add</span>
              Add Article
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm disabled:cursor-not-allowed disabled:opacity-50"
              type="submit"
              disabled={!canSubmit || isLoading}
            >
              <span className="material-symbols-outlined">{isLoading ? 'sync' : 'psychology'}</span>
              {isLoading ? 'Analyzing' : 'Run Agents'}
            </button>
          </div>

          {newsNotice && <AlertMessage tone="warning" message={newsNotice} />}
          {error && <AlertMessage tone="error" message={error} />}
        </section>

        <section className="xl:col-span-7 flex flex-col gap-md">
          <AgentStatus isLoading={isLoading} summary={summary} sentiment={sentiment} />
          <NewsArticlesPanel articles={newsArticles} isLoading={isFetchingNews} symbol={lastFetchedSymbol || normalizedSymbol} />
          <RecommendationPanel sentiment={sentiment} />
          <SummaryPanel summary={summary} />
          <SentimentPanel sentiment={sentiment} />
        </section>
      </form>
    </div>
  );
}

function AlertMessage({ message, tone }) {
  const isError = tone === 'error';

  return (
    <div className={`rounded-lg border p-md font-body-md text-body-md ${isError ? 'border-error/40 bg-error-container/20 text-error' : 'border-tertiary/40 bg-tertiary-container/10 text-tertiary-fixed'}`}>
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-base mt-1">{isError ? 'error' : 'info'}</span>
        <span>{message}</span>
      </div>
    </div>
  );
}

function NewsArticlesPanel({ articles, isLoading, symbol }) {
  if (isLoading) {
    return <EmptyPanel title="Latest News" icon="newspaper" text={`Searching news for ${symbol}.`} />;
  }

  if (articles.length === 0) {
    return <EmptyPanel title="Latest News" icon="newspaper" text="Search a ticker to display the latest news articles." />;
  }

  return (
    <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">newspaper</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Latest News</h2>
        </div>
        <span className="font-data-mono text-data-mono text-on-surface-variant">
          {symbol} - {articles.length} article{articles.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="flex flex-col gap-sm">
        {articles.map((article, index) => (
          <NewsArticleCard article={article} index={index} key={`${article.title}-${index}`} />
        ))}
      </div>
    </section>
  );
}

function NewsArticleCard({ article, index }) {
  const normalizedSentiment = (article.sentiment || 'neutral').toLowerCase();
  const sentimentStyle = sentimentStyles[normalizedSentiment] || sentimentStyles.neutral;
  const description = article.description || article.content || 'No description available.';

  return (
    <article className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md flex flex-col gap-sm">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-sm">
        <div className="flex flex-col gap-1">
          <div className="font-data-mono text-[11px] text-on-surface-variant">
            #{index + 1} - {article.source || 'Unknown source'}{article.published_at ? ` - ${article.published_at}` : ''}
          </div>
          <h3 className="font-label-sm text-label-sm text-on-surface">{article.title || 'Untitled article'}</h3>
        </div>
        {article.sentiment && (
          <span className={`inline-flex w-fit rounded border px-2 py-1 font-label-sm text-[11px] uppercase ${sentimentStyle}`}>
            {article.sentiment}
          </span>
        )}
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant">{description}</p>
      {article.url && (
        <a
          className="inline-flex w-fit items-center gap-1 text-primary hover:text-primary-fixed font-label-sm text-label-sm"
          href={article.url}
          target="_blank"
          rel="noreferrer"
        >
          Open article
          <span className="material-symbols-outlined text-base">open_in_new</span>
        </a>
      )}
    </article>
  );
}

function AgentStatus({ isLoading, summary, sentiment }) {
  const statusItems = [
    { label: 'News Summarizer', done: Boolean(summary), icon: 'summarize' },
    { label: 'Sentiment Agent', done: Boolean(sentiment), icon: 'psychology' },
    { label: 'Recommendation Logic', done: Boolean(sentiment?.recommendation), icon: 'rule' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      {statusItems.map((item) => (
        <div className="glass-panel rounded-xl p-md flex items-center gap-3" key={item.label}>
          <span className={`material-symbols-outlined ${item.done ? 'text-primary' : 'text-outline'}`}>{item.icon}</span>
          <div>
            <div className="font-label-sm text-label-sm text-on-surface">{item.label}</div>
            <div className="font-data-mono text-[11px] text-on-surface-variant">
              {item.done ? 'Complete' : isLoading ? 'Running' : 'Waiting'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecommendationPanel({ sentiment }) {
  if (!sentiment?.recommendation) {
    return <EmptyPanel title="Recommendation" icon="rule" text="Run the agents to calculate Buy / Hold / Sell from sentiment evidence." />;
  }

  const recommendation = sentiment.recommendation;
  const style = recommendationStyles[recommendation.action] || recommendationStyles.Hold;

  return (
    <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">rule</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Recommendation</h2>
        </div>
        <div className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 font-headline-md text-headline-md ${style}`}>
          {recommendation.action}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <Metric label="Score" value={recommendation.score} />
        <Metric label="Confidence" value={`${Math.round(recommendation.confidence * 100)}%`} />
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant">{recommendation.reasoning}</p>

      <div className="flex flex-col gap-2">
        {recommendation.factors.map((factor, index) => (
          <div className="flex gap-2 text-on-surface-variant font-body-md text-body-md" key={index}>
            <span className="material-symbols-outlined text-primary text-base mt-1">check_circle</span>
            <span>{factor}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryPanel({ summary }) {
  if (!summary) {
    return <EmptyPanel title="Summary" icon="summarize" text="The AI-generated summary, key points, risks, and citations will appear here." />;
  }

  return (
    <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">summarize</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Summary</h2>
        </div>
        <span className="font-data-mono text-data-mono text-on-surface-variant">{summary.source_count} sources</span>
      </div>

      <p className="font-body-lg text-body-lg text-on-surface">{summary.short_summary}</p>
      <p className="font-body-md text-body-md text-on-surface-variant">{summary.detailed_summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <ListBlock title="Key Points" items={summary.key_points} icon="trending_up" />
        <ListBlock title="Risks" items={summary.risks} icon="warning" />
      </div>

      <div className="border-t border-outline-variant/20 pt-md">
        <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-sm">Citations</h3>
        <div className="flex flex-col gap-2">
          {summary.citations.map((citation) => (
            <a
              className="text-primary hover:text-primary-fixed font-body-md text-body-md"
              href={citation.url || '#'}
              key={`${citation.article_index}-${citation.title}`}
              target="_blank"
              rel="noreferrer"
            >
              [{citation.article_index}] {citation.title}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SentimentPanel({ sentiment }) {
  if (!sentiment) {
    return <EmptyPanel title="Sentiment" icon="psychology" text="Overall and article-level sentiment labels will appear after analysis." />;
  }

  const sentimentStyle = sentimentStyles[sentiment.overall_sentiment] || sentimentStyles.neutral;

  return (
    <section className="glass-panel rounded-xl p-lg flex flex-col gap-md">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">psychology</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Sentiment</h2>
        </div>
        <div className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 font-label-sm text-label-sm uppercase ${sentimentStyle}`}>
          {sentiment.overall_sentiment}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <Metric label="Confidence" value={`${Math.round(sentiment.confidence * 100)}%`} />
        <Metric label="Positive" value={sentiment.positive_count} />
        <Metric label="Neutral" value={sentiment.neutral_count} />
        <Metric label="Negative" value={sentiment.negative_count} />
      </div>

      <ListBlock title="Drivers" items={sentiment.key_drivers} icon="bolt" />

      <div className="flex flex-col gap-sm">
        {sentiment.article_sentiments.map((article) => (
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md" key={article.article_index}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
              <h3 className="font-label-sm text-label-sm text-on-surface">{article.title}</h3>
              <span className={`inline-flex w-fit rounded border px-2 py-1 font-label-sm text-[11px] uppercase ${sentimentStyles[article.sentiment] || sentimentStyles.neutral}`}>
                {article.sentiment} - {Math.round(article.confidence * 100)}%
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">{article.reason}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyPanel({ title, icon, text }) {
  return (
    <section className="glass-panel rounded-xl p-lg flex items-center gap-md text-on-surface-variant">
      <span className="material-symbols-outlined text-outline">{icon}</span>
      <div>
        <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        <p className="font-body-md text-body-md">{text}</p>
      </div>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md">
      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase">{label}</div>
      <div className="font-headline-md text-headline-md text-on-surface mt-1">{value}</div>
    </div>
  );
}

function ListBlock({ title, items, icon }) {
  return (
    <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-md">
      <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-sm flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-base">{icon}</span>
        {title}
      </h3>
      <ul className="flex flex-col gap-2">
        {items.map((item, index) => (
          <li className="font-body-md text-body-md text-on-surface-variant" key={index}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
