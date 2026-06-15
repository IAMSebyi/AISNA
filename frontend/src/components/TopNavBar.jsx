import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getProfile, PROFILE_CHANGED_EVENT } from '../services/profileStorage';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/portfolio', label: 'Favorites' },
];

export default function TopNavBar() {
  const [profile, setProfile] = useState(() => getProfile());
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const handleProfileChanged = () => setProfile(getProfile());

    window.addEventListener(PROFILE_CHANGED_EVENT, handleProfileChanged);
    window.addEventListener('storage', handleProfileChanged);

    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, handleProfileChanged);
      window.removeEventListener('storage', handleProfileChanged);
    };
  }, []);

  const initials = profile.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AI';

  return (
    <header className="bg-surface/90 backdrop-blur-xl border-b border-white/10 shadow-sm sticky top-0 z-50">
      <div className="flex justify-between items-center w-full px-3 sm:px-margin-mobile md:px-margin-desktop py-3.5 max-w-7xl mx-auto gap-2 sm:gap-4">
        {/* Left Side: Logo */}
        <NavLink to="/" className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity">
          <div className="relative flex items-center justify-center">
            <svg className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_rgba(77,142,255,0.3)]" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#4d8eff" />
                  <stop offset="100%" stopColor="#adc6ff" />
                </linearGradient>
              </defs>
              <path d="M6 24L13 17L17 21L25 12" stroke="url(#logo-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M18 12H25V19" stroke="url(#logo-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="24" r="2.5" fill="#4d8eff" />
              <circle cx="13" cy="17" r="2.5" fill="#adc6ff" />
              <circle cx="17" cy="21" r="2.5" fill="#4d8eff" />
              <circle cx="25" cy="12" r="3.5" fill="#ffb786" />
            </svg>
            <div className="absolute -inset-1 rounded-full bg-primary/10 blur-sm -z-10 animate-pulse"></div>
          </div>
          <span className="font-headline-md text-headline-md font-bold tracking-tight bg-gradient-to-r from-primary via-secondary to-tertiary bg-clip-text text-transparent hidden sm:inline-block">
            AISNA
          </span>
        </NavLink>

        {/* Center: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                `rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 font-label-sm text-[11px] sm:text-label-sm transition-colors ${
                  isActive
                    ? 'bg-secondary-container text-on-secondary-container'
                    : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                }`
              }
              to={item.to}
              key={item.to}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right Side: Settings & Stock Analyst Profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Settings Shortcut Button */}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center justify-center h-9 w-9 rounded-lg border border-outline-variant/30 bg-surface-container/60 hover:border-primary/60 hover:bg-surface-variant/40 hover:text-primary transition-all duration-200 ${
                isActive ? 'text-primary border-primary/40 bg-primary/10' : 'text-on-surface-variant'
              }`
            }
            title="Settings"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">settings</span>
          </NavLink>

          {/* Profile Menu Dropdown */}
          <div className="relative">
            <button
              className="flex items-center gap-1 lg:gap-3 rounded-lg border border-transparent lg:border-outline-variant/30 bg-transparent lg:bg-surface-container/60 p-0 lg:px-2 lg:py-2 text-left hover:border-primary/60 transition-colors cursor-pointer"
              type="button"
              onClick={() => setProfileOpen((current) => !current)}
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary font-label-sm text-label-sm shrink-0 shadow-sm hover:scale-105 transition-transform duration-200">
                {initials}
              </span>
              <span className="hidden lg:flex flex-col min-w-0">
                <span className="font-label-sm text-label-sm text-on-surface truncate">{profile.name}</span>
                <span className="font-data-mono text-[11px] text-on-surface-variant truncate">{profile.riskProfile}</span>
              </span>
              <span className="hidden lg:inline-block material-symbols-outlined text-on-surface-variant text-base">
                {profileOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-lg border border-outline-variant/30 bg-surface-container-high shadow-xl p-md z-50">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary font-label-sm text-label-sm">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <div className="font-label-sm text-label-sm text-on-surface truncate">{profile.name}</div>
                    <div className="font-body-md text-body-md text-on-surface-variant truncate">{profile.role}</div>
                    <div className="font-data-mono text-[11px] text-primary mt-1">{profile.riskProfile} risk</div>
                  </div>
                </div>
                <NavLink
                  className="mt-md inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm"
                  to="/settings"
                  onClick={() => setProfileOpen(false)}
                >
                  <span className="material-symbols-outlined text-base">manage_accounts</span>
                  Edit Profile
                </NavLink>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
