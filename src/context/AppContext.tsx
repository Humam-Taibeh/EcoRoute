import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';

export type Language = 'en' | 'ar';
export type Theme    = 'dark' | 'light';
export type Dir      = 'ltr' | 'rtl';

export interface UserProfile {
  name:   string;
  avatar: string | null;
}

interface AppCtxValue {
  language:      Language;
  theme:         Theme;
  dir:           Dir;
  profile:       UserProfile;
  setLanguage:   (l: Language) => void;
  setTheme:      (t: Theme)    => void;
  updateProfile: (p: Partial<UserProfile>) => void;
}

interface LanguageCtxValue {
  language: Language;
  dir: Dir;
  setLanguage: (l: Language) => void;
}

interface ThemeCtxValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

interface ProfileCtxValue {
  profile: UserProfile;
  updateProfile: (p: Partial<UserProfile>) => void;
}

// ─── Persistence helpers ───────────────────────────────────────────────────────
function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem('ecoroute-profile');
    if (raw) return JSON.parse(raw) as UserProfile;
  } catch { /* ignore */ }
  return { name: '', avatar: null };
}
function saveProfile(p: UserProfile) {
  try { localStorage.setItem('ecoroute-profile', JSON.stringify(p)); } catch { /* ignore */ }
}
function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem('ecoroute-theme');
    if (raw === 'light' || raw === 'dark') return raw;
  } catch { /* ignore */ }
  return 'dark';
}
function loadLanguage(): Language {
  try {
    const raw = localStorage.getItem('ecoroute-language');
    if (raw === 'en' || raw === 'ar') return raw;
  } catch { /* ignore */ }
  return 'en';
}

// ─── Contexts ──────────────────────────────────────────────────────────────────
const AppContext = createContext<AppCtxValue>({
  language: 'en', theme: 'dark', dir: 'ltr',
  profile: { name: '', avatar: null },
  setLanguage: () => {}, setTheme: () => {}, updateProfile: () => {},
});
const LanguageContext = createContext<LanguageCtxValue>({
  language: 'en', dir: 'ltr', setLanguage: () => {},
});
const ThemeContext = createContext<ThemeCtxValue>({
  theme: 'dark', setTheme: () => {},
});
const ProfileContext = createContext<ProfileCtxValue>({
  profile: { name: '', avatar: null }, updateProfile: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLang]    = useState<Language>(loadLanguage);
  const [theme, setThemeState] = useState<Theme>(loadTheme);
  const [profile, setProfile]  = useState<UserProfile>(loadProfile);

  const dir: Dir = language === 'ar' ? 'rtl' : 'ltr';

  const setLanguage = useCallback((next: Language) => {
    setLang(next);
    try { localStorage.setItem('ecoroute-language', next); } catch { /* ignore */ }
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try { localStorage.setItem('ecoroute-theme', next); } catch { /* ignore */ }
  }, []);

  const updateProfile = useCallback((p: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...p };
      saveProfile(next);
      return next;
    });
  }, []);

  // Sync document attributes — CSS variable theme switch is instant via class toggle
  useEffect(() => {
    document.documentElement.dir  = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  // Theme: toggle class → CSS variables update instantly (sub-50ms, no re-render needed)
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const languageValue = useMemo(
    () => ({ language, dir, setLanguage }),
    [language, dir, setLanguage]
  );
  const themeValue = useMemo(
    () => ({ theme, setTheme }),
    [theme, setTheme]
  );
  const profileValue = useMemo(
    () => ({ profile, updateProfile }),
    [profile, updateProfile]
  );
  const appValue = useMemo(
    () => ({ language, theme, dir, profile, setLanguage, setTheme, updateProfile }),
    [language, theme, dir, profile, setLanguage, setTheme, updateProfile]
  );

  return (
    <LanguageContext.Provider value={languageValue}>
      <ThemeContext.Provider value={themeValue}>
        <ProfileContext.Provider value={profileValue}>
          <AppContext.Provider value={appValue}>
            {children}
          </AppContext.Provider>
        </ProfileContext.Provider>
      </ThemeContext.Provider>
    </LanguageContext.Provider>
  );
}

export const useApp          = () => useContext(AppContext);
export const useAppLanguage  = () => useContext(LanguageContext);
export const useAppTheme     = () => useContext(ThemeContext);
export const useAppProfile   = () => useContext(ProfileContext);

// ─── Theme-aware colour tokens (memoized per theme) ────────────────────────────
export function useThemeColors() {
  const { theme } = useAppTheme();
  const d = theme === 'dark';
  return useMemo(() => ({
    textPrimary:   d ? 'rgba(255,255,255,0.92)' : '#1D1D1F',
    textSecondary: d ? 'rgba(255,255,255,0.55)' : '#6E6E73',
    textDim:       d ? 'rgba(255,255,255,0.35)' : '#8E8E93',
    textMuted:     d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)',
    textUnit:      d ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.30)',
    textInactive:  d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.30)',
    textDesc:      d ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.45)',
    textSub:       d ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.38)',
    divider:       d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    dividerV:      d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    brandDivider:  d ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    tabActiveBg:   d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    scoreRingBg:   d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    activeDotStroke: d ? '#050505' : '#F5F5F7',
    compassMajor:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)',
    compassMinor:  d ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    southNeedle:   d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)',
    tooltipLabel:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
    chartCursor:   d ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    settingsTitle:    d ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.50)',
    settingsDivider:  d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    settingsSecLabel: d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.38)',
    settingsSecIcon:  d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.30)',
    settingsSegBg:    d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    settingsSegBorder:d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)',
    settingsSegActive:d ? 'rgba(255,255,255,0.88)' : '#1D1D1F',
    settingsSegInactive: d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.38)',
    settingsInput:    d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    settingsFooter:   d ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.25)',
    closeBtn:         d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    closeBtnBorder:   d ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)',
    closeIcon:        d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)',
    aiTitle:     d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    aiInsight:   d ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.72)',
    aiBadge:     d ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.30)',
    brandText:   d ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.65)',
    routeLabel:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
    settingsBtn: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    settingsBtnBorder: d ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.10)',
    settingsGear: d ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
    langIndicatorInactive: d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
    panelBg:     d ? 'rgba(10,10,14,0.80)' : 'rgba(255,255,255,0.80)',
    fieldBg:     d ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    fieldFocusBg:d ? 'rgba(0,212,255,0.06)' : 'rgba(0,212,255,0.07)',
  } as const), [d]);
}
