import { useState } from 'react';
import { getProfile, RISK_PROFILES, saveProfile } from '../services/profileStorage';

export default function Settings() {
  const [profile, setProfile] = useState(() => getProfile());
  const [notice, setNotice] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const savedProfile = saveProfile(profile);
    setProfile(savedProfile);
    setNotice('Profile saved locally for this browser.');
  };

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-lg">
      <header className="flex flex-col gap-sm pb-sm border-b border-outline-variant/20">
        <p className="font-label-sm text-label-sm text-primary uppercase">AISNA Profile</p>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
          Configure the local analyst profile used by the demo interface.
        </p>
      </header>

      <section className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        <form className="xl:col-span-7 glass-panel rounded-xl p-lg flex flex-col gap-md" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">manage_accounts</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Profile</h2>
          </div>

          <label className="flex flex-col gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Name</span>
            <input
              className="rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
              maxLength={60}
              onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
              value={profile.name}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Role</span>
            <input
              className="rounded-lg border border-outline-variant/40 bg-surface-container-highest px-4 py-3 text-on-surface outline-none focus:border-primary"
              maxLength={80}
              onChange={(event) => setProfile((current) => ({ ...current, role: event.target.value }))}
              value={profile.role}
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Risk Profile</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-sm">
              {RISK_PROFILES.map((riskProfile) => (
                <button
                  className={`rounded-lg border px-4 py-3 font-label-sm text-label-sm transition-colors ${
                    profile.riskProfile === riskProfile
                      ? 'border-primary/60 bg-primary/10 text-primary'
                      : 'border-outline-variant/40 text-on-surface-variant hover:text-on-surface hover:border-primary'
                  }`}
                  key={riskProfile}
                  onClick={() => setProfile((current) => ({ ...current, riskProfile }))}
                  type="button"
                >
                  {riskProfile}
                </button>
              ))}
            </div>
          </div>

          <button
            className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-on-primary hover:bg-primary-fixed transition-colors font-label-sm text-label-sm"
            type="submit"
          >
            <span className="material-symbols-outlined text-base">save</span>
            Save Profile
          </button>

          {notice && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-md text-primary font-body-md text-body-md">
              {notice}
            </div>
          )}
        </form>

        <aside className="xl:col-span-5 glass-panel rounded-xl p-lg flex flex-col gap-md">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">security</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Demo Guardrails</h2>
          </div>
          <ul className="flex flex-col gap-2 font-body-md text-body-md text-on-surface-variant">
            <li>Search accepts only ticker-like input.</li>
            <li>Article editor fields have length limits and metadata validation.</li>
            <li>Saved reports are stored only in localStorage.</li>
            <li>The recommendation is generated from sentiment output, not direct trading advice.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
