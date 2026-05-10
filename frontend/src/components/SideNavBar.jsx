import { Link } from 'react-router-dom';

export default function SideNavBar() {
  return (
    <nav className="hidden md:flex flex-col h-screen sticky left-0 top-0 w-64 bg-surface-container-low/60 dark:bg-surface-container-low/60 backdrop-blur-xl border-r border-white/5 py-lg gap-sm z-40">
      <div className="px-margin-desktop mb-md">
        <h1 className="font-headline-md text-headline-md text-on-surface">Agent Center</h1>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">Monitoring 12 active streams</p>
      </div>
      <div className="flex-1 flex flex-col gap-1 mt-md">
        <Link className="bg-secondary-container text-on-secondary-container rounded-lg mx-2 px-4 py-3 flex items-center gap-3 transition-all scale-95 font-label-sm text-label-sm" to="/terminal">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>sensors</span>
          Live Stream
        </Link>
        <Link className="text-on-surface-variant hover:bg-surface-variant/30 mx-2 px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-surface-variant/50 transition-all font-label-sm text-label-sm" to="/analysis">
          <span className="material-symbols-outlined">summarize</span>
          News Summarizer
        </Link>
        <Link className="text-on-surface-variant hover:bg-surface-variant/30 mx-2 px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-surface-variant/50 transition-all font-label-sm text-label-sm" to="/analysis">
          <span className="material-symbols-outlined">psychology</span>
          Sentiment Agent
        </Link>
        <Link className="text-on-surface-variant hover:bg-surface-variant/30 mx-2 px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-surface-variant/50 transition-all font-label-sm text-label-sm" to="/terminal">
          <span className="material-symbols-outlined">terminal</span>
          Logic Engine
        </Link>
      </div>
      <div className="mt-auto px-4 mb-md">
        <button className="w-full bg-primary text-on-primary font-label-sm text-label-sm py-3 rounded-lg hover:bg-primary-fixed transition-colors">Upgrade Analysis</button>
      </div>
      <div className="flex flex-col gap-1 border-t border-white/5 pt-md">
        <Link className="text-on-surface-variant hover:bg-surface-variant/30 mx-2 px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-surface-variant/50 transition-all font-label-sm text-label-sm" to="/settings">
          <span className="material-symbols-outlined">settings</span>
          Settings
        </Link>
        <a className="text-on-surface-variant hover:bg-surface-variant/30 mx-2 px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-surface-variant/50 transition-all font-label-sm text-label-sm" href="#">
          <span className="material-symbols-outlined">description</span>
          Documentation
        </a>
      </div>
    </nav>
  );
}
