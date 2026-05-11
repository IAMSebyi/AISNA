import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidStockSymbol, normalizeStockSymbol } from '../services/stocksApi';

export default function Terminal() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [searchSymbol, setSearchSymbol] = useState('');
  const [searchError, setSearchError] = useState('');
  const [messages] = useState([
    { time: '10:42:01', source: 'System', text: 'Cluster initialization complete. All nodes responsive.', type: 'info' },
    { time: '10:42:15', source: 'Data Node', text: 'Establishing websocket connection to prime brokers... SUCCESS.', type: 'success' },
    { time: '10:45:30', source: 'Input', text: 'User requested deep scan for ticker: AAPL', type: 'bold' },
    { time: '10:45:31', source: 'News Alpha', text: 'Fetching last 72 hours of SEC filings and press releases for AAPL...', type: 'info', indent: true },
    { time: '10:45:33', source: 'Sentiment Beta', text: 'Ingesting social media firehose for cashtag $AAPL...', type: 'warn', indent: true },
    { time: '10:45:38', source: 'News Alpha', text: 'Summarization complete. Found 12 relevant articles. Key themes: "Supply chain resilience", "Vision Pro mixed reviews".', type: 'normal', indent: true },
    { time: '10:45:41', source: 'Sentiment Beta', text: 'Analyzing sentiment... NLP confidence score: 0.89. Overall sentiment: BULLISH (76%).', type: 'highlight', indent: true }
  ]);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setStatus(data.nodes))
      .catch(err => console.error("Backend not running yet:", err));
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const normalizedSymbol = normalizeStockSymbol(searchSymbol);

    if (!isValidStockSymbol(normalizedSymbol)) {
      setSearchError('Enter a valid ticker.');
      return;
    }

    navigate(`/analysis?symbol=${encodeURIComponent(normalizedSymbol)}`);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto mb-lg flex flex-col md:flex-row gap-md items-start md:items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Live Agent Terminal</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Real-time processing cluster operational{status ? ` - ${status.length} backend nodes` : ''}.
          </p>
        </div>
        <form className="w-full md:w-96 flex flex-col gap-2" onSubmit={handleSearch}>
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
              placeholder="ENTER TICKER (e.g. MSFT, AAPL)..."
              type="text"
              value={searchSymbol}
            />
            <button
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-primary"
              type="submit"
              aria-label="Search ticker"
            >
              <span className="font-label-sm text-label-sm bg-surface-container-low px-2 py-1 rounded">↵</span>
            </button>
          </div>
          {searchError && <span className="font-label-sm text-label-sm text-error">{searchError}</span>}
        </form>
      </div>
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-4 flex flex-col gap-md">
          <div className="glass-panel rounded-xl p-lg h-full flex flex-col">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">memory</span>
              Cluster Status
            </h3>
            <div className="flex flex-col gap-4">
              <div className="bg-surface-container/50 rounded-lg p-4 border border-outline/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary pulse-live"></div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface">News Summarizer Alpha</div>
                    <div className="font-data-mono text-[10px] text-on-surface-variant mt-1">PID: 9024 | CPU: 12%</div>
                  </div>
                </div>
                <span className="bg-primary/10 text-primary px-2 py-1 rounded font-label-sm text-[10px] uppercase">Active</span>
              </div>
              <div className="bg-surface-container/50 rounded-lg p-4 border border-outline/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-tertiary-container pulse-live" style={{animationDelay: '0.5s'}}></div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface">Sentiment Engine Beta</div>
                    <div className="font-data-mono text-[10px] text-on-surface-variant mt-1">PID: 9025 | CPU: 48%</div>
                  </div>
                </div>
                <span className="bg-tertiary-container/10 text-tertiary px-2 py-1 rounded font-label-sm text-[10px] uppercase text-tertiary-fixed">Processing</span>
              </div>
              <div className="bg-surface-container/50 rounded-lg p-4 border border-outline/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-outline"></div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface">Logic Core Gamma</div>
                    <div className="font-data-mono text-[10px] text-outline mt-1">PID: 9026 | CPU: 1%</div>
                  </div>
                </div>
                <span className="bg-surface-variant text-on-surface-variant px-2 py-1 rounded font-label-sm text-[10px] uppercase">Idle</span>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8">
          <div className="glass-panel rounded-xl h-[600px] flex flex-col overflow-hidden relative border-t-2 border-t-primary/50">
            <div className="bg-surface-container-highest px-4 py-3 flex items-center justify-between border-b border-outline/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-outline-variant text-sm">terminal</span>
                <span className="font-data-mono text-data-mono text-on-surface-variant">Live System Output</span>
              </div>
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-outline-variant/30"></span>
                <span className="w-3 h-3 rounded-full bg-outline-variant/30"></span>
                <span className="w-3 h-3 rounded-full bg-outline-variant/30"></span>
              </div>
            </div>
            <div className="flex-1 p-lg overflow-y-auto font-data-mono text-data-mono space-y-3 relative">
              <div className="absolute top-0 left-0 w-full h-12 bg-gradient-to-b from-[rgba(39,42,49,0.8)] to-transparent pointer-events-none"></div>
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.indent ? 'pl-4' : ''}`}>
                  <span className="text-outline-variant">[{msg.time}]</span>
                  <span className={`text-${msg.type === 'warn' ? 'tertiary' : 'primary'}`}>[{msg.source}]</span>
                  <span className={msg.type === 'bold' ? 'text-on-surface font-bold' : 'text-on-surface-variant'}>{msg.text}</span>
                </div>
              ))}
              <div className="flex items-start gap-3 pl-4 bg-surface-container/50 p-2 rounded">
                <span className="text-outline-variant">[10:45:45]</span>
                <span className="text-secondary">[Logic Core]</span>
                <span className="text-on-surface">Synthesizing report... Awaiting final metrics alignment.</span>
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 w-full bg-surface-container-highest border-t border-white/10 py-2 z-50">
        <div className="ticker-wrap font-data-mono text-data-mono flex items-center">
          <div className="ticker text-on-surface-variant">
            {['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA'].map((ticker, i) => (
              <span key={i} className="inline-flex items-center gap-2 mx-4">
                <span className="font-bold text-on-surface">{ticker}</span> 100.00 
                <span className="text-primary material-symbols-outlined text-sm">arrow_upward</span> +1.0%
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
