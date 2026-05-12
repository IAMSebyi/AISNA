const PROFILE_KEY = 'aisna.profile';
const PROFILE_CHANGED_EVENT = 'aisna:profile-changed';

const DEFAULT_PROFILE = {
  name: 'Demo Analyst',
  role: 'Research analyst',
  riskProfile: 'Balanced',
};

const RISK_PROFILES = ['Conservative', 'Balanced', 'Aggressive'];

export function getProfile() {
  try {
    const storedValue = window.localStorage.getItem(PROFILE_KEY);
    const parsedValue = JSON.parse(storedValue || '{}');
    return normalizeProfile({ ...DEFAULT_PROFILE, ...parsedValue });
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile) {
  const normalizedProfile = normalizeProfile(profile);
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(normalizedProfile));
  window.dispatchEvent(new Event(PROFILE_CHANGED_EVENT));
  return normalizedProfile;
}

function normalizeProfile(profile) {
  const name = String(profile?.name || DEFAULT_PROFILE.name).trim().slice(0, 60);
  const role = String(profile?.role || DEFAULT_PROFILE.role).trim().slice(0, 80);
  const riskProfile = RISK_PROFILES.includes(profile?.riskProfile)
    ? profile.riskProfile
    : DEFAULT_PROFILE.riskProfile;

  return {
    name: name || DEFAULT_PROFILE.name,
    role: role || DEFAULT_PROFILE.role,
    riskProfile,
  };
}

export { DEFAULT_PROFILE, PROFILE_CHANGED_EVENT, RISK_PROFILES };
