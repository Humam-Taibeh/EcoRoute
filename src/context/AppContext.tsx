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
  avatar: string | null; // data-URL or null → shows initials
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

const AppContext = createContext<AppCtxValue>({
  language:      'en',
  theme:         'dark',
  dir:           'ltr',
  profile:       { name: 'Driver', avatar: null },
  setLanguage:   () => {},
  setTheme:      () => {},
  updateProfile: () => {},
});

const LanguageContext = createContext<LanguageCtxValue>({
  language: 'en',
  dir: 'ltr',
  setLanguage: () => {},
});

const ThemeContext = createContext<ThemeCtxValue>({
  theme: 'dark',
  setTheme: () => {},
});

const ProfileContext = createContext<ProfileCtxValue>({
  profile: { name: 'Driver', avatar: null },
  updateProfile: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLang]     = useState<Language>('en');
  const [theme, setThemeState]  = useState<Theme>('dark');
  const [profile, setProfile]   = useState<UserProfile>({ name: 'Humam', avatar: null });

  const dir: Dir = language === 'ar' ? 'rtl' : 'ltr';
  const setLanguage = useCallback((next: Language) => setLang(next), []);
  const setTheme = useCallback((next: Theme) => setThemeState(next), []);
  const updateProfile = useCallback((p: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
  }, []);

  // Sync document direction + lang attribute
  useEffect(() => {
    document.documentElement.dir  = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  // Sync theme class on <html>
  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const languageValue = useMemo(() => ({
    language,
    dir,
    setLanguage,
  }), [language, dir, setLanguage]);

  const themeValue = useMemo(() => ({
    theme,
    setTheme,
  }), [theme, setTheme]);

  const profileValue = useMemo(() => ({
    profile,
    updateProfile,
  }), [profile, updateProfile]);

  const appValue = useMemo(() => ({
    language,
    theme,
    dir,
    profile,
    setLanguage,
    setTheme,
    updateProfile,
  }), [language, theme, dir, profile, setLanguage, setTheme, updateProfile]);

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

export const useApp = () => useContext(AppContext);
export const useAppLanguage = () => useContext(LanguageContext);
export const useAppTheme = () => useContext(ThemeContext);
export const useAppProfile = () => useContext(ProfileContext);

// ─── Theme-aware colour tokens ─────────────────────────────────────────────
export function useThemeColors() {
  const { theme } = useAppTheme();
  const d = theme === 'dark';
  return useMemo(() => ({
    // Text
    textPrimary:   d ? 'rgba(255,255,255,0.90)' : '#1D1D1F',
    textSecondary: d ? 'rgba(255,255,255,0.55)' : '#6E6E73',
    textDim:       d ? 'rgba(255,255,255,0.35)' : '#86868B',
    textMuted:     d ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.25)',
    textUnit:      d ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.28)',
    textInactive:  d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.38)',
    textDesc:      d ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.45)',
    textSub:       d ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.38)',
    // Structural
    divider:       d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    dividerV:      d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    brandDivider:  d ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.1)',
    tabActiveBg:   d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    // Misc components
    scoreRingBg:   d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
    activeDotStroke: d ? '#050505'              : '#F5F5F7',
    // Compass
    compassMajor:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)',
    compassMinor:  d ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    southNeedle:   d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.18)',
    // Chart tooltip
    tooltipLabel:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
    chartCursor:   d ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
    // Settings / panels
    settingsTitle:    d ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
    settingsDivider:  d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
    settingsSecLabel: d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.38)',
    settingsSecIcon:  d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.3)',
    settingsSegBg:    d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    settingsSegBorder:d ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)',
    settingsSegActive:d ? 'rgba(255,255,255,0.88)' : '#1D1D1F',
    settingsSegInactive: d ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.38)',
    settingsInput:    d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    settingsFooter:   d ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.25)',
    closeBtn:         d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    closeBtnBorder:   d ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)',
    closeIcon:        d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.4)',
    // AI copilot
    aiTitle:     d ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    aiInsight:   d ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.72)',
    aiBadge:     d ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.3)',
    // HUD brand bar
    brandText:   d ? 'rgba(255,255,255,0.7)'  : 'rgba(0,0,0,0.65)',
    routeLabel:  d ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.45)',
    settingsBtn: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    settingsBtnBorder: d ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)',
    settingsGear: d ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
    langIndicatorInactive: d ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.28)',
  } as const), [d]);
}
