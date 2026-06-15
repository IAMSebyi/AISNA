import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  clearSavedAnalyses,
  findCachedAnalysis,
  getSavedAnalyses,
  removeSavedAnalysis,
  saveAnalysisRecord,
} from '../services/analysisArchiveStorage';
import { analyzeNewsReport } from '../services/analysisApi';
import { isFavoriteTicker, toggleFavoriteTicker } from '../services/favoritesStorage';
import { addSearchHistoryItem, clearSearchHistory, getSearchHistory } from '../services/searchHistoryStorage';
import { fetchStockNews, isValidStockSymbol, normalizeStockSymbol } from '../services/stocksApi';
import StockChart from '../components/StockChart';
import { getProfile } from '../services/profileStorage';

const initialArticles = [
  {
    title: 'Apple reports stronger iPhone demand',
    source: 'Reuters',
    url: 'https://example.com/apple-demand',
    published_at: '2026-05-11',
    description: 'Apple demand appears stronger than expected.',
    content: 'Analysts reported increased demand for recent iPhone models and resilient services revenue.',
    sentiment: 'Bullish',
    relevance_score: 0.91,
    sentiment_score: 0.42,
  },
  {
    title: 'Apple services revenue grows despite hardware concerns',
    source: 'Bloomberg',
    url: 'https://example.com/apple-services',
    published_at: '2026-05-11',
    description: 'Services revenue remains a bright spot.',
    content: "Apple's services segment continued to grow, helping offset concerns about slower hardware upgrade cycles.",
    sentiment: 'Somewhat-Bullish',
    relevance_score: 0.86,
    sentiment_score: 0.31,
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

const SENTIMENT_OPTIONS = [
  { value: 'Bullish', label: 'Bullish', color: 'emerald' },
  { value: 'Somewhat-Bullish', label: 'Somewhat Bullish', color: 'teal' },
  { value: 'Neutral', label: 'Neutral', color: 'slate' },
  { value: 'Somewhat-Bearish', label: 'Somewhat Bearish', color: 'orange' },
  { value: 'Bearish', label: 'Bearish', color: 'red' },
];

const CATEGORY_OPTIONS = [
  'Earnings',
  'Product',
  'Executive',
  'Macro',
  'M&A',
  'Regulation',
  'Other',
];

const getLocalDateString = (isoString) => {
  if (!isoString) return '';
  const match = isoString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return match[1];
  }
  try {
    const d = new Date(isoString);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  } catch {
    // Ignore
  }
  return '';
};

const getSentimentBadgeStyles = (sentiment) => {
  const norm = sentiment ? sentiment.toLowerCase() : '';
  if (norm.includes('bullish') || norm === 'positive') {
    return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }
  if (norm.includes('bearish') || norm === 'negative') {
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  }
  if (norm) {
    return 'text-sky-400 bg-sky-500/10 border-sky-500/20';
  }
  return '';
};

function emptyArticle() {
  return {
    title: '',
    source: '',
    url: '',
    published_at: '',
    description: '',
    content: '',
    sentiment: '',
    category: '',
    relevance_score: null,
    sentiment_score: null,
  };
}

const PROMPT_INJECTION_PATTERNS = [
  /\b(ignore|bypass|override|forget|disregard)\b.{0,80}\b(prompt|instruction|system|developer|json|schema)\b/i,
  /\b(chatgpt|openai|llm|language model)\b.{0,80}\b(ignore|bypass|override|forget|disregard|generate|write|print|output)\b/i,
  /\b(generate|write|print|output)\b.{0,80}\b(hello world|c\+\+|python|javascript|code)\b/i,
  /\b(act as|you are now|system prompt|developer message)\b/i,
];

function validateAnalysisInput(symbol, articles) {
  if (!isValidStockSymbol(symbol)) {
    return 'Enter a valid ticker using 1-12 letters, numbers, dots, or hyphens.';
  }

  if (articles.length === 0) {
    return 'Add at least one article with a title before running the analysis.';
  }

  for (const [index, article] of articles.entries()) {
    const articleNumber = index + 1;
    const titleLetters = (article.title.match(/[A-Za-z]/g) || []).length;
    const combinedText = [article.title, article.description, article.content].filter(Boolean).join(' ');
    const wordCount = (combinedText.match(/[A-Za-z0-9][A-Za-z0-9'.-]*/g) || []).length;
    const letterCount = (combinedText.match(/[A-Za-z]/g) || []).length;

    if (titleLetters < 3) {
      return `Article ${articleNumber} needs a meaningful title.`;
    }

    if (wordCount < 5 || letterCount < 20) {
      return `Article ${articleNumber} needs enough description or content to analyze.`;
    }

    if (article.url && !isValidHttpUrl(article.url)) {
      return `Article ${articleNumber} URL must be a valid HTTP or HTTPS URL.`;
    }

    if (article.published_at && !isValidIsoDateOrDateTime(article.published_at)) {
      return `Article ${articleNumber} published date must be a valid ISO date.`;
    }

    if ([article.title, article.description, article.content].some(containsPromptInjection)) {
      return `Article ${articleNumber} does not look like valid market news.`;
    }
  }

  return '';
}

function containsPromptInjection(value) {
  if (!value) return false;
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidIsoDateOrDateTime(value) {
  const normalizedValue = String(value || '').trim();
  if (!normalizedValue) return true;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    const date = new Date(`${normalizedValue}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && normalizedValue === date.toISOString().slice(0, 10);
  }

  if (!/^\d{4}-\d{2}-\d{2}T/.test(normalizedValue)) {
    return false;
  }

  return !Number.isNaN(Date.parse(normalizedValue));
}

function normalizeProviderSentiment(sentiment) {
  const normalizedSentiment = String(sentiment || '').toLowerCase();
  if (normalizedSentiment.includes('bullish') || normalizedSentiment === 'positive') {
    return 'positive';
  }
  if (normalizedSentiment.includes('bearish') || normalizedSentiment === 'negative') {
    return 'negative';
  }
  return 'neutral';
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
  const [lastFetchedSymbol, setLastFetchedSymbol] = useState(initialSymbol);
  const [newsArticles, setNewsArticles] = useState([]);
  const [showArticleEditor, setShowArticleEditor] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [, setFavoriteTickersVersion] = useState(0);
  const [searchHistory, setSearchHistory] = useState(() => getSearchHistory());
  const [savedAnalyses, setSavedAnalyses] = useState(() => getSavedAnalyses());
  const [activeResultPanel, setActiveResultPanel] = useState('');

  const normalizedSymbol = normalizeStockSymbol(symbol);
  const symbolIsValid = isValidStockSymbol(symbol);
  const isCurrentTickerFavorite = symbolIsValid && isFavoriteTicker(normalizedSymbol);

  const canSubmit = useMemo(() => {
    return symbolIsValid && articles.some((article) => String(article.title || '').trim());
  }, [articles, symbolIsValid]);

  const updateArticle = (index, field, value) => {
    setArticles((current) =>
      current.map((article, articleIndex) =>
        articleIndex === index ? { ...article, [field]: value } : article,
      ),
    );
  };

  const addArticle = () => {
    setArticles((current) => {
      const next = [...current, emptyArticle()];
      setExpandedIndex(next.length - 1);
      return next;
    });
  };

  const removeArticle = (index) => {
    setArticles((current) => {
      const next = current.filter((_, articleIndex) => articleIndex !== index);
      if (expandedIndex >= next.length) {
        setExpandedIndex(next.length - 1);
      } else if (expandedIndex === index) {
        setExpandedIndex(Math.max(0, index - 1));
      }
      return next;
    });
  };

  const resetSample = () => {
    setArticles(initialArticles);
    setSymbol('AAPL');
    setSummary(null);
    setSentiment(null);
    setActiveResultPanel('');
    setError('');
    setNewsNotice('');
    setLastFetchedSymbol('AAPL');
    setNewsArticles([]);
    setShowArticleEditor(false);
    setExpandedIndex(0);
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
    setActiveResultPanel('');

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
          sentiment: article.sentiment || '',
          category: article.category || '',
          relevance_score: typeof article.relevance_score === 'number' ? article.relevance_score : null,
          sentiment_score: typeof article.sentiment_score === 'number' ? article.sentiment_score : null,
        })));
        setLastFetchedSymbol(normalizedSymbol);
        setSearchHistory(addSearchHistoryItem(normalizedSymbol));
        setExpandedIndex(0);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch news.');
    } finally {
      setIsFetchingNews(false);
    }
  };

  const handleUseHistoryItem = (historySymbol) => {
    setSymbol(historySymbol);
    setError('');
    setNewsNotice('');
  };

  const handleClearHistory = () => {
    clearSearchHistory();
    setSearchHistory([]);
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

  const applyReport = (report) => {
    setSummary(report.summary);
    setSentiment({
      ...report.sentiment,
      recommendation: report.recommendation,
    });
    setActiveResultPanel('');
  };

  const handleLoadSavedAnalysis = (record) => {
    const norm = normalizeStockSymbol(record.symbol);
    setSymbol(norm);
    setLastFetchedSymbol(norm);
    setArticles(record.articles);
    applyReport(record.report);
    setNewsNotice(`Loaded saved ${record.symbol} report from ${formatHistoryTime(record.createdAt)}.`);
    setError('');
    setShowArticleEditor(false);
  };

  const handleRemoveSavedAnalysis = (id) => {
    removeSavedAnalysis(id);
    setSavedAnalyses(getSavedAnalyses());
  };

  const handleClearSavedAnalyses = () => {
    clearSavedAnalyses();
    setSavedAnalyses([]);
  };

  const runAnalysis = async (event) => {
    event.preventDefault();
    setError('');
    setNewsNotice('');
    setSummary(null);
    setSentiment(null);
    setActiveResultPanel('');

    const payloadArticles = articles
      .filter((article) => String(article.title || '').trim())
      .map((article) => ({
        ...article,
        title: String(article.title || '').trim(),
        source: String(article.source || '').trim(),
        url: String(article.url || '').trim(),
        published_at: String(article.published_at || '').trim(),
        description: String(article.description || '').trim() || null,
        content: String(article.content || '').trim() || null,
        sentiment: String(article.sentiment || '').trim() || null,
        category: String(article.category || '').trim() || null,
        relevance_score: typeof article.relevance_score === 'number' ? article.relevance_score : null,
        sentiment_score: typeof article.sentiment_score === 'number' ? article.sentiment_score : null,
      }));

    const activeProfile = getProfile();
    const validationError = validateAnalysisInput(normalizedSymbol, payloadArticles);
    if (validationError) {
      setError(validationError);
      return;
    }

    const cachedAnalysis = findCachedAnalysis(normalizedSymbol, payloadArticles, activeProfile.riskProfile);
    if (cachedAnalysis) {
      applyReport(cachedAnalysis.report);
      setNewsNotice(`Loaded saved ${normalizedSymbol} report from ${formatHistoryTime(cachedAnalysis.createdAt)}.`);
      return;
    }

    setIsLoading(true);

    const payload = {
      symbol: normalizedSymbol,
      articles: payloadArticles,
      max_key_points: 5,
      risk_profile: activeProfile.riskProfile,
    };

    try {
      const report = await analyzeNewsReport(payload);
      applyReport(report);
      saveAnalysisRecord({
        symbol: normalizedSymbol,
        articles: payloadArticles,
        report,
        riskProfile: activeProfile.riskProfile,
      });
      setSavedAnalyses(getSavedAnalyses());
      setNewsNotice(`${normalizedSymbol} report saved.`);
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
          <p className="font-label-sm text-label-sm text-primary uppercase">AISNA Research Workspace</p>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mt-1">News Analysis</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-3xl">
            Search recent news, generate a concise summary, review sentiment, and compare the Buy / Hold / Sell recommendation.
          </p>
        </div>
      </header>

      <form className="grid grid-cols-1 xl:grid-cols-12 gap-gutter" onSubmit={runAnalysis}>
        <section className="xl:col-span-5 flex flex-col gap-md">
          <div className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Input</h2>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">Search a ticker, fetch news, then analyze the selected articles.</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/40 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-label-sm text-label-sm"
                type="button"
                onClick={resetSample}
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Sample
              </button>
            </div>

            <label className="flex flex-col gap-2">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Ticker</span>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
                <input
                  className={`min-w-0 rounded-lg border bg-surface-container-highest px-4 py-3 font-data-mono text-data-mono text-on-surface outline-none focus:border-primary ${symbol && !symbolIsValid ? 'border-error/70' : 'border-outline-variant/40'}`}
                  maxLength={12}
                  value={symbol}
                  onChange={(event) => setSymbol(normalizeStockSymbol(event.target.value))}
                  placeholder="AAPL"
                />
                <button
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  onClick={handleFetchNews}
                  disabled={isFetchingNews || !symbolIsValid}
                >
                  <span className={`material-symbols-outlined text-base ${isFetchingNews ? 'animate-spin' : ''}`}>{isFetchingNews ? 'sync' : 'search'}</span>
                  {isFetchingNews ? 'Searching' : 'Search'}
                </button>
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

            <SearchHistoryPanel
              history={searchHistory.slice(0, 5)}
              onClear={handleClearHistory}
              onSelect={handleUseHistoryItem}
            />

            <SavedAnalysesPanel
              records={savedAnalyses.slice(0, 5)}
              onClear={handleClearSavedAnalyses}
              onLoad={handleLoadSavedAnalysis}
              onRemove={handleRemoveSavedAnalysis}
            />
          </div>

          <div className="glass-panel rounded-xl p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between gap-md">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface">Selected Articles</h2>
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
                {articles.map((article, index) => {
                  const isExpanded = expandedIndex === index;
                  const isStandard = CATEGORY_OPTIONS.filter((opt) => opt !== 'Other').includes(article.category);
                  const selectedOption = article.category ? (isStandard ? article.category : 'Other') : '';
                  const titleText = article.title ? String(article.title).trim() : '';

                  return (
                    <div
                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'border-primary/40 bg-surface-container/80 shadow-md'
                          : 'border-outline-variant/20 bg-surface-container/40 hover:bg-surface-container/60'
                      }`}
                      key={index}
                    >
                      {/* Accordion Header */}
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer select-none gap-3"
                        onClick={() => setExpandedIndex(isExpanded ? -1 : index)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Number Badge */}
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                              isExpanded ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                            }`}
                          >
                            {index + 1}
                          </span>
                          {/* Title text */}
                          <span
                            className={`font-label-sm text-sm truncate max-w-[180px] sm:max-w-[320px] md:max-w-[400px] ${
                              titleText ? 'text-on-surface font-semibold' : 'text-on-surface-variant/50 italic'
                            }`}
                          >
                            {titleText || 'Untitled Article'}
                          </span>
                          
                          {/* Sentiment Badge (Collapsed only) */}
                          {!isExpanded && article.sentiment && (
                            <span className={`hidden xs:inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase ${getSentimentBadgeStyles(article.sentiment)}`}>
                              {article.sentiment}
                            </span>
                          )}

                          {/* Category Badge (Collapsed only) */}
                          {!isExpanded && article.category && (
                            <span className="hidden sm:inline-flex rounded border border-outline-variant/30 bg-surface-container-high px-1.5 py-0.5 text-[10px] text-on-surface-variant font-medium">
                              {article.category}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Delete button (inside header) */}
                          {articles.length > 1 && (
                            <button
                              className="text-on-surface-variant hover:text-error transition-colors p-1 rounded hover:bg-surface-variant/40"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeArticle(index);
                              }}
                              aria-label={`Remove article ${index + 1}`}
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          )}
                          {/* Expand chevron */}
                          <span className="material-symbols-outlined text-on-surface-variant transition-transform duration-200">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </div>
                      </div>

                      {/* Accordion Body */}
                      {isExpanded && (
                        <div className="p-4 border-t border-outline-variant/20 flex flex-col gap-md">
                          {/* Title */}
                          <label className="flex flex-col gap-2">
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Title *</span>
                            <input
                              className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm font-semibold"
                              maxLength={240}
                              value={article.title}
                              onChange={(event) => updateArticle(index, 'title', event.target.value)}
                              placeholder="Enter article title"
                              required
                            />
                          </label>

                          {/* Source & Date */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                            <label className="flex flex-col gap-2">
                              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Source</span>
                              <input
                                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm"
                                maxLength={120}
                                value={article.source}
                                onChange={(event) => updateArticle(index, 'source', event.target.value)}
                                placeholder="e.g. Bloomberg, Reuters"
                              />
                            </label>

                            <label className="flex flex-col gap-2">
                              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Published Date</span>
                              <input
                                type="date"
                                className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm"
                                value={getLocalDateString(article.published_at)}
                                onChange={(event) => updateArticle(index, 'published_at', event.target.value)}
                              />
                            </label>
                          </div>

                          {/* URL */}
                          <label className="flex flex-col gap-2">
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Article URL</span>
                            <input
                              className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm"
                              maxLength={2048}
                              type="url"
                              value={article.url}
                              onChange={(event) => updateArticle(index, 'url', event.target.value)}
                              placeholder="https://example.com/article"
                            />
                          </label>

                          {/* Sentiment pill selector */}
                          <div className="flex flex-col gap-2">
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Sentiment</span>
                            <div className="flex flex-wrap gap-2">
                              {SENTIMENT_OPTIONS.map((opt) => {
                                const isSelected = article.sentiment === opt.value;
                                let btnClass = 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary';
                                if (isSelected) {
                                  if (opt.color === 'emerald') btnClass = 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400';
                                  else if (opt.color === 'teal') btnClass = 'border-teal-500/50 bg-teal-500/15 text-teal-400';
                                  else if (opt.color === 'slate') btnClass = 'border-slate-500/50 bg-slate-500/15 text-slate-400';
                                  else if (opt.color === 'orange') btnClass = 'border-orange-500/50 bg-orange-500/15 text-orange-400';
                                  else if (opt.color === 'red') btnClass = 'border-red-500/50 bg-red-500/15 text-red-400';
                                }
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => updateArticle(index, 'sentiment', opt.value)}
                                    className={`rounded-lg border px-3 py-2 text-xs font-label-sm transition-all duration-200 cursor-pointer ${btnClass}`}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Category pill selector */}
                          <div className="flex flex-col gap-2">
                            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Category</span>
                            <div className="flex flex-wrap gap-2">
                              {CATEGORY_OPTIONS.map((opt) => {
                                const isSelected = selectedOption === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      if (opt === 'Other') {
                                        updateArticle(index, 'category', 'Custom');
                                      } else {
                                        updateArticle(index, 'category', opt);
                                      }
                                    }}
                                    className={`rounded-lg border px-3 py-2 text-xs font-label-sm transition-all duration-200 cursor-pointer ${
                                      isSelected
                                        ? 'border-primary/60 bg-primary/10 text-primary'
                                        : 'border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {selectedOption === 'Other' && (
                              <input
                                className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm"
                                maxLength={120}
                                value={article.category === 'Custom' ? '' : article.category}
                                onChange={(event) => updateArticle(index, 'category', event.target.value)}
                                placeholder="Type custom category..."
                              />
                            )}
                          </div>

                          {/* Description */}
                          <label className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Description</span>
                              <span className="text-[11px] text-on-surface-variant/70">{article.description?.length || 0}/1200</span>
                            </div>
                            <textarea
                              className="min-h-20 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm"
                              maxLength={1200}
                              value={article.description || ''}
                              onChange={(event) => updateArticle(index, 'description', event.target.value)}
                              placeholder="Article description"
                            />
                          </label>

                          {/* Content */}
                          <label className="flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Content *</span>
                              <span className="text-[11px] text-on-surface-variant/70">{article.content?.length || 0}/8000</span>
                            </div>
                            <textarea
                              className="min-h-28 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary text-sm"
                              maxLength={8000}
                              value={article.content}
                              onChange={(event) => updateArticle(index, 'content', event.target.value)}
                              placeholder="Article content"
                              required
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  );
                })}
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
              {isLoading ? 'Analyzing' : 'Analyze News'}
            </button>
          </div>

          {newsNotice && <AlertMessage tone="warning" message={newsNotice} />}
          {error && <AlertMessage tone="error" message={error} />}

        </section>

        <section className="xl:col-span-7 flex flex-col gap-md">
          <AgentStatus
            activePanel={activeResultPanel}
            isLoading={isLoading}
            onSelect={setActiveResultPanel}
            summary={summary}
            sentiment={sentiment}
          />
          {lastFetchedSymbol && isValidStockSymbol(lastFetchedSymbol) && (
            <StockChart key={lastFetchedSymbol} symbol={lastFetchedSymbol} articles={articles} />
          )}
          <NewsArticlesPanel articles={newsArticles} isLoading={isFetchingNews} symbol={lastFetchedSymbol || normalizedSymbol} />
          <ResultPanelHost activePanel={activeResultPanel} sentiment={sentiment} summary={summary} />
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

function SearchHistoryPanel({ history, onClear, onSelect }) {
  if (history.length === 0) {
    return (
      <section className="rounded-lg border border-outline-variant/20 bg-surface-container/50 p-md flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined text-outline text-base">history</span>
        <div className="min-w-0">
          <h3 className="font-label-sm text-label-sm text-on-surface">Recent Searches</h3>
          <p className="font-data-mono text-[11px]">Searched tickers will appear here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-outline-variant/20 bg-surface-container/50 p-md flex flex-col gap-sm">
      <div className="flex items-center justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-base">history</span>
          <h3 className="font-label-sm text-label-sm text-on-surface">Recent Searches</h3>
        </div>
        <button
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors font-label-sm text-label-sm"
          type="button"
          onClick={onClear}
        >
          <span className="material-symbols-outlined text-base">delete_sweep</span>
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-sm">
        {history.map((item) => (
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-outline-variant/30 bg-surface-container/60 px-3 py-2 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-data-mono text-data-mono"
            type="button"
            onClick={() => onSelect(item.symbol)}
            key={`${item.symbol}-${item.searchedAt}`}
            title={`Searched ${formatHistoryTime(item.searchedAt)}`}
          >
            <span>{item.symbol}</span>
            <span className="material-symbols-outlined text-base">north_west</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SavedAnalysesPanel({ records, onClear, onLoad, onRemove }) {
  if (records.length === 0) {
    return (
      <section className="rounded-lg border border-outline-variant/20 bg-surface-container/50 p-md flex items-center gap-3 text-on-surface-variant">
        <span className="material-symbols-outlined text-outline text-base">save</span>
        <div className="min-w-0">
          <h3 className="font-label-sm text-label-sm text-on-surface">Saved Reports</h3>
          <p className="font-data-mono text-[11px]">Completed reports will appear here.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-outline-variant/20 bg-surface-container/50 p-md flex flex-col gap-sm">
      <div className="flex items-center justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-base">save</span>
          <h3 className="font-label-sm text-label-sm text-on-surface">Saved Reports</h3>
        </div>
        <button
          className="inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors font-label-sm text-label-sm"
          type="button"
          onClick={onClear}
        >
          <span className="material-symbols-outlined text-base">delete_sweep</span>
          Clear
        </button>
      </div>

      <div className="flex flex-col gap-sm">
        {records.map((record) => (
          <div className="rounded-lg border border-outline-variant/20 bg-surface-container/60 p-sm flex items-center justify-between gap-sm" key={record.id}>
            <button
              className="min-w-0 text-left"
              type="button"
              onClick={() => onLoad(record)}
              title="Open saved report"
            >
              <div className="font-data-mono text-data-mono text-primary">{record.symbol}</div>
              <div className="font-data-mono text-[11px] text-on-surface-variant truncate">
                {formatHistoryTime(record.createdAt)} - {record.articleCount} articles
              </div>
            </button>
            <button
              className="shrink-0 text-on-surface-variant hover:text-error transition-colors"
              type="button"
              onClick={() => onRemove(record.id)}
              aria-label={`Remove saved ${record.symbol} analysis`}
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function formatHistoryTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'recently';
  }

  return date.toLocaleString();
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
  const normalizedSentiment = normalizeProviderSentiment(article.sentiment);
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
      {typeof article.relevance_score === 'number' && (
        <span className="font-data-mono text-[11px] text-on-surface-variant">
          Relevance: {Math.round(article.relevance_score * 100)}%
        </span>
      )}
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

function AgentStatus({ activePanel, isLoading, onSelect, summary, sentiment }) {
  const statusItems = [
    { id: 'summary', label: 'Summary', done: Boolean(summary), icon: 'summarize' },
    { id: 'sentiment', label: 'Sentiment', done: Boolean(sentiment), icon: 'psychology' },
    { id: 'recommendation', label: 'Recommendation', done: Boolean(sentiment?.recommendation), icon: 'rule' },
  ];

  const handleSelect = (item) => {
    if (!item.done) return;

    onSelect(item.id);
    window.requestAnimationFrame(() => {
      document.getElementById('agent-result-panel')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
      {statusItems.map((item) => (
        <button
          className={`glass-panel rounded-xl p-md flex items-center gap-3 text-left transition-colors ${item.done ? 'hover:border-primary cursor-pointer' : 'cursor-default'} ${activePanel === item.id ? 'border-primary/60 bg-primary/10' : ''}`}
          key={item.label}
          type="button"
          onClick={() => handleSelect(item)}
          disabled={!item.done}
        >
          <span className={`material-symbols-outlined ${item.done ? 'text-primary' : 'text-outline'}`}>{item.icon}</span>
          <div>
            <div className="font-label-sm text-label-sm text-on-surface">{item.label}</div>
            <div className="font-data-mono text-[11px] text-on-surface-variant">
              {item.done ? 'Complete - open' : isLoading ? 'Running' : 'Waiting'}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ResultPanelHost({ activePanel, sentiment, summary }) {
  if (!summary && !sentiment) {
    return <EmptyPanel title="Analysis Results" icon="insights" text="Analyze the selected articles, then open completed result cards above." />;
  }

  if (!activePanel) {
    return <EmptyPanel title="Analysis Results" icon="touch_app" text="Select a completed result card to review the output." />;
  }

  return (
    <div id="agent-result-panel" className="scroll-mt-24">
      {activePanel === 'summary' && <SummaryPanel summary={summary} />}
      {activePanel === 'sentiment' && <SentimentPanel sentiment={sentiment} />}
      {activePanel === 'recommendation' && <RecommendationPanel sentiment={sentiment} />}
    </div>
  );
}

function RecommendationPanel({ sentiment }) {
  if (!sentiment?.recommendation) {
    return <EmptyPanel title="Recommendation" icon="rule" text="Analyze the articles to calculate Buy / Hold / Sell from sentiment evidence." />;
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
