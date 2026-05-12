const ANALYSIS_ARCHIVE_KEY = 'aisna.savedAnalyses';
const ANALYSIS_ARCHIVE_CHANGED_EVENT = 'aisna:saved-analyses-changed';
const MAX_ANALYSIS_RECORDS = 12;

export function getSavedAnalyses() {
  try {
    const storedValue = window.localStorage.getItem(ANALYSIS_ARCHIVE_KEY);
    const parsedValue = JSON.parse(storedValue || '[]');
    return Array.isArray(parsedValue) ? parsedValue.filter(isValidRecord) : [];
  } catch {
    return [];
  }
}

export function findCachedAnalysis(symbol, articles) {
  const signature = buildAnalysisSignature(symbol, articles);
  return getSavedAnalyses().find((record) => record.signature === signature) || null;
}

export function saveAnalysisRecord({ symbol, articles, report }) {
  const normalizedSymbol = String(symbol || '').trim().toUpperCase();
  const normalizedArticles = normalizeArticles(articles);
  const signature = buildAnalysisSignature(normalizedSymbol, normalizedArticles);
  const existingRecords = getSavedAnalyses().filter((record) => record.signature !== signature);
  const nextRecord = {
    id: `${normalizedSymbol}-${Date.now()}`,
    signature,
    symbol: normalizedSymbol,
    createdAt: new Date().toISOString(),
    articleCount: normalizedArticles.length,
    headlines: normalizedArticles.slice(0, 3).map((article) => article.title),
    articles: normalizedArticles,
    report,
  };

  const nextRecords = [nextRecord, ...existingRecords].slice(0, MAX_ANALYSIS_RECORDS);
  saveRecords(nextRecords);
  return nextRecord;
}

export function removeSavedAnalysis(id) {
  saveRecords(getSavedAnalyses().filter((record) => record.id !== id));
}

export function clearSavedAnalyses() {
  saveRecords([]);
}

export function buildAnalysisSignature(symbol, articles) {
  const normalizedPayload = JSON.stringify({
    symbol: String(symbol || '').trim().toUpperCase(),
    articles: normalizeArticles(articles),
  });

  return `analysis-${simpleHash(normalizedPayload)}`;
}

function normalizeArticles(articles) {
  return (Array.isArray(articles) ? articles : [])
    .map((article) => ({
      title: String(article?.title || '').trim(),
      source: String(article?.source || '').trim(),
      url: String(article?.url || '').trim(),
      published_at: String(article?.published_at || '').trim(),
      description: String(article?.description || '').trim(),
      content: String(article?.content || '').trim(),
      sentiment: article?.sentiment ? String(article.sentiment).trim() : null,
      category: article?.category ? String(article.category).trim() : null,
      relevance_score: typeof article?.relevance_score === 'number' ? article.relevance_score : null,
      sentiment_score: typeof article?.sentiment_score === 'number' ? article.sentiment_score : null,
    }))
    .filter((article) => article.title);
}

function saveRecords(records) {
  window.localStorage.setItem(ANALYSIS_ARCHIVE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(ANALYSIS_ARCHIVE_CHANGED_EVENT));
}

function isValidRecord(record) {
  return Boolean(
    record
      && typeof record.id === 'string'
      && typeof record.symbol === 'string'
      && typeof record.createdAt === 'string'
      && record.report
      && Array.isArray(record.articles),
  );
}

function simpleHash(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export { ANALYSIS_ARCHIVE_CHANGED_EVENT };
