import { useEffect, useState } from 'react';
import { fetchStockHistory } from '../services/stocksApi';

const PERIODS = [
  { value: '1mo', label: '1M' },
  { value: '3mo', label: '3M' },
  { value: '6mo', label: '6M' },
  { value: '1y', label: '1Y' },
];

export default function StockChart({ symbol, articles = [] }) {
  const [period, setPeriod] = useState('1mo');
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hoveredEvent, setHoveredEvent] = useState(null);

  useEffect(() => {
    if (!symbol) return;
    let isCancelled = false;

    async function loadHistory() {
      setIsLoading(true);
      setError('');
      try {
        const data = await fetchStockHistory(symbol, period);
        if (!isCancelled) {
          setHistory(data.history || []);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err.message || 'Failed to load stock history.');
          setHistory([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [symbol, period]);

  // Chart dimensions
  const width = 600;
  const height = 300;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Calculate scales if history data is present
  const prices = history.map((p) => p.close);
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 100;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const priceRange = maxPrice - minPrice || 1.0;
  const paddingFactor = priceRange * 0.08;
  const yMax = maxPrice + paddingFactor;
  const yMin = Math.max(0, minPrice - paddingFactor);
  const yRange = yMax - yMin;

  const points = history.map((point, i) => {
    const x = paddingLeft + (i / (history.length - 1)) * chartWidth;
    const y = height - paddingBottom - ((point.close - yMin) / yRange) * chartHeight;
    return { x, y, ...point };
  });

  const linePath = points.length > 0
    ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`
    : '';

  // Grid lines
  const gridCount = 5;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const val = yMin + (i / (gridCount - 1)) * yRange;
    const y = height - paddingBottom - (i / (gridCount - 1)) * chartHeight;
    return { val, y };
  });

  // X axis date labels (showing start, middle, and end dates)
  const xLabels = [];
  if (history.length > 1) {
    xLabels.push(points[0]);
    xLabels.push(points[Math.floor(points.length / 2)]);
    xLabels.push(points[points.length - 1]);
  }

  // Find articles matching dates in history
  const overlayEvents = [];
  if (points.length > 0 && articles.length > 0) {
    articles.forEach((article) => {
      if (!article.title || !article.published_at) return;
      const articleDate = article.published_at.split('T')[0];
      const match = points.find((p) => p.date === articleDate);
      if (match) {
        overlayEvents.push({
          ...article,
          x: match.x,
          y: match.y,
          close: match.close,
          date: match.date,
        });
      }
    });
  }

  // Helper to determine sentiment color
  const getSentimentColor = (sentiment) => {
    const s = String(sentiment || '').toLowerCase();
    if (s.includes('bullish') || s === 'positive') return '#10b981'; // Emerald
    if (s.includes('bearish') || s === 'negative') return '#ef4444'; // Red
    return '#38bdf8'; // Sky
  };

  return (
    <section className="glass-panel rounded-xl p-lg flex flex-col gap-md relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">monitoring</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {symbol} Price Chart
          </h2>
        </div>

        <div className="flex items-center bg-surface-container/80 rounded-lg p-1 border border-outline-variant/30 self-start z-20">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              className={`px-3 py-1.5 rounded-md font-data-mono text-xs transition-colors cursor-pointer ${
                period === p.value
                  ? 'bg-primary text-on-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              onClick={() => setPeriod(p.value)}
              type="button"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[300px]">
        {isLoading && (
          <div className="absolute inset-0 bg-surface-container/40 flex items-center justify-center rounded-lg z-10 backdrop-blur-[1px]">
            <span className="material-symbols-outlined text-primary animate-spin text-4xl">
              sync
            </span>
          </div>
        )}

        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center p-md text-center bg-surface-container/25 rounded-lg z-10 border border-outline-variant/10">
            <div>
              <span className="material-symbols-outlined text-error text-3xl mb-2">
                error
              </span>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                {error}
              </p>
            </div>
          </div>
        )}

        {!isLoading && !error && history.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container/20 rounded-lg z-10 border border-outline-variant/10">
            <p className="font-body-md text-body-md text-on-surface-variant">
              No historical price data available for {symbol}.
            </p>
          </div>
        )}

        {!error && history.length > 0 && (
          <div className="w-full h-full relative">
            <svg
              className="w-full h-full overflow-visible"
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines and Y labels */}
              {gridLines.map((line, idx) => (
                <g key={idx} className="opacity-40">
                  <line
                    x1={paddingLeft}
                    y1={line.y}
                    x2={width - paddingRight}
                    y2={line.y}
                    stroke="var(--color-outline-variant)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={line.y + 4}
                    fill="var(--color-on-surface-variant)"
                    fontSize="10"
                    textAnchor="end"
                    className="font-data-mono"
                  >
                    ${line.val.toFixed(2)}
                  </text>
                </g>
              ))}

              {/* Gradient Area Fill */}
              {areaPath && (
                <path d={areaPath} fill="url(#chartGradient)" />
              )}

              {/* Price Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X Axis labels */}
              {xLabels.map((pt, idx) => (
                <text
                  key={idx}
                  x={pt.x}
                  y={height - paddingBottom + 20}
                  fill="var(--color-on-surface-variant)"
                  fontSize="10"
                  textAnchor={idx === 0 ? 'start' : idx === 2 ? 'end' : 'middle'}
                  className="font-data-mono opacity-60"
                >
                  {pt.date}
                </text>
              ))}

              {/* Sentiment Overlay Markers */}
              {overlayEvents.map((evt, idx) => {
                const markerColor = getSentimentColor(evt.sentiment);
                return (
                  <g
                    key={idx}
                    className="cursor-default"
                    onMouseEnter={() => setHoveredEvent(evt)}
                    onMouseLeave={() => setHoveredEvent(null)}
                  >
                    <circle
                      cx={evt.x}
                      cy={evt.y}
                      r="6"
                      fill={markerColor}
                      stroke="var(--color-surface)"
                      strokeWidth="2"
                      className="transition-transform duration-150 hover:scale-[1.4] filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                    />
                    <circle
                      cx={evt.x}
                      cy={evt.y}
                      r="12"
                      fill="transparent"
                      className="hover:fill-current hover:opacity-[0.1]"
                      style={{ color: markerColor }}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Custom Tooltip */}
            {hoveredEvent && (
              <div
                className="absolute z-20 glass-panel rounded-lg p-md max-w-xs pointer-events-none transform -translate-x-1/2 -translate-y-full flex flex-col gap-xs text-left shadow-2xl border border-outline-variant/50 filter drop-shadow-lg"
                style={{
                  left: `${(hoveredEvent.x / width) * 100}%`,
                  top: `${(hoveredEvent.y / height) * 100 - 8}%`,
                }}
              >
                <div className="flex items-center justify-between gap-md border-b border-outline-variant/30 pb-xs">
                  <span className="font-data-mono text-[10px] text-on-surface-variant">
                    {hoveredEvent.date} • {hoveredEvent.source || 'News'}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 font-data-mono text-[9px] uppercase border"
                    style={{
                      borderColor: getSentimentColor(hoveredEvent.sentiment),
                      color: getSentimentColor(hoveredEvent.sentiment),
                      backgroundColor: `${getSentimentColor(hoveredEvent.sentiment)}15`,
                    }}
                  >
                    {hoveredEvent.sentiment || 'Neutral'}
                  </span>
                </div>
                <h4 className="font-label-sm text-[12px] text-on-surface leading-tight font-bold">
                  {hoveredEvent.title}
                </h4>
                <div className="flex items-center justify-between mt-1 border-t border-outline-variant/20 pt-1">
                  <span className="font-label-sm text-[10px] text-on-surface-variant">Close Price:</span>
                  <span className="font-data-mono text-[11px] text-primary font-bold">
                    ${hoveredEvent.close.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
