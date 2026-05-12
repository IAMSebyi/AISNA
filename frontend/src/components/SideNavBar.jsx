import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/analysis', label: 'News Analysis', icon: 'psychology' },
  { to: '/portfolio', label: 'Favorites', icon: 'star' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
];

export default function SideNavBar() {
  return (
    <nav className="hidden md:flex flex-col h-screen sticky left-0 top-0 w-64 bg-surface-container-low/80 backdrop-blur-xl border-r border-white/5 py-lg gap-sm z-40">
      <div className="px-margin-desktop mb-md">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-on-primary">
            <span className="material-symbols-outlined">monitoring</span>
          </span>
          <div className="min-w-0">
            <h1 className="font-headline-md text-headline-md text-on-surface leading-7">
              AI Stock News Analyzer
            </h1>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1 mt-md">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `mx-2 px-4 py-3 rounded-lg flex items-center gap-3 transition-colors font-label-sm text-label-sm ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'text-on-surface-variant hover:bg-surface-variant/50 hover:text-on-surface'
              }`
            }
            to={item.to}
            key={item.to}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </div>

      <div className="px-4">
        <NavLink
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-outline-variant/40 px-4 py-3 text-on-surface-variant hover:text-on-surface hover:border-primary transition-colors font-label-sm text-label-sm"
          to="/analysis"
        >
          <span className="material-symbols-outlined text-base">add_chart</span>
          New Analysis
        </NavLink>
      </div>
    </nav>
  );
}
