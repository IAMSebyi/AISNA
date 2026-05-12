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
      <div className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-md min-w-0">
          <span className="md:hidden font-headline-md text-headline-md font-bold text-on-surface truncate">
            AI Stock News Analyzer
          </span>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 font-label-sm text-label-sm transition-colors ${
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
        </div>

        <div className="relative">
          <button
            className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container/60 px-2 py-2 text-left hover:border-primary/60 transition-colors"
            type="button"
            onClick={() => setProfileOpen((current) => !current)}
            aria-expanded={profileOpen}
            aria-label="Open profile menu"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary font-label-sm text-label-sm">
              {initials}
            </span>
            <span className="hidden lg:flex flex-col min-w-0">
              <span className="font-label-sm text-label-sm text-on-surface truncate">{profile.name}</span>
              <span className="font-data-mono text-[11px] text-on-surface-variant truncate">{profile.riskProfile}</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-base">
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
    </header>
  );
}
