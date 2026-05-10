export default function Analysis() {
  return (
    <div className="flex-1 flex flex-col gap-lg w-full">
      <header className="flex justify-between items-end pb-sm border-b border-outline-variant/20">
        <div>
          <div className="flex items-center gap-sm mb-xs">
            <h1 className="font-display-lg text-display-lg text-on-surface">AAPL</h1>
            <span className="px-2 py-1 rounded bg-surface-container-highest text-on-surface-variant font-data-mono text-data-mono">Apple Inc.</span>
          </div>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-on-surface">$189.43</span>
            <span className="font-data-mono text-data-mono text-emerald-400">+2.15 (+1.15%)</span>
          </div>
        </div>
      </header>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter">
        <div className="xl:col-span-2 flex flex-col gap-gutter">
          <div className="bg-surface-container border border-outline-variant/20 rounded-xl p-lg flex flex-col md:flex-row gap-lg items-center relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="flex-shrink-0 flex flex-col items-center justify-center p-md bg-surface-container-highest rounded-full w-32 h-32 border-4 border-emerald-400/20">
              <span className="font-display-lg text-display-lg text-emerald-400 leading-none mb-1">BUY</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Signal</span>
            </div>
            <div className="flex-1 z-10">
              <div className="flex items-center gap-2 mb-sm">
                <span className="material-symbols-outlined text-primary text-headline-md">psychology</span>
                <h3 className="font-headline-md text-headline-md text-on-surface">AI Reasoning</h3>
              </div>
              <p className="font-body-md text-body-md text-on-surface-variant mb-md">
                  Strong positive sentiment identified across major tech publications regarding the upcoming product cycle. Supply chain constraints appear to be resolving faster than market consensus.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
