import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { useAppLanguage, useAppProfile, useThemeColors } from '../context/AppContext';

// ─── Clock ────────────────────────────────────────────────────────────────────
function Clock() {
  const tc = useThemeColors();
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-data" style={{ fontSize: 11, color: tc.textDim }}>{t}</span>;
}

// ─── HUDStats — Mini top-right status pill ───────────────────────────────────
export const HUDStats = memo(function HUDStats({
  systemReady,
  onSettingsClick,
}: {
  systemReady:     boolean;
  onSettingsClick: () => void;
}) {
  const { profile } = useAppProfile();
  const { language, dir } = useAppLanguage();
  const tc = useThemeColors();
  const side = dir === 'rtl' ? 'left' : 'right';

  const initials = profile.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 20 }}
      style={{ position: 'fixed', top: 16, [side]: 16, zIndex: 10 }}
    >
      <div
        className="panel"
        style={{
          borderRadius: 40, padding: '7px 8px 7px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        {/* Live dot + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            className="status-live"
            style={{ background: systemReady ? '#00E676' : tc.textMuted }}
          />
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
            color: tc.brandText, textTransform: 'uppercase',
          }}>
            EcoRoute
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: tc.brandDivider }} />
        <Clock />
        <div style={{ width: 1, height: 14, background: tc.brandDivider }} />

        {/* Language */}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          color: language === 'ar' ? '#00D4FF' : tc.langIndicatorInactive,
          textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
        }}>
          {language === 'ar' ? 'ع' : 'EN'}
        </span>

        {/* Settings + avatar */}
        <button
          ref={btnRef}
          onClick={onSettingsClick}
          title="Settings"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: tc.settingsBtn,
            border: `1px solid ${tc.settingsBtnBorder}`,
            borderRadius: 28, padding: '5px 10px 5px 5px',
            cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background   = 'rgba(0,212,255,0.08)';
            (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(0,212,255,0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background   = tc.settingsBtn;
            (e.currentTarget as HTMLElement).style.borderColor  = tc.settingsBtnBorder;
          }}
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt={profile.name}
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,212,255,0.3)' }} />
          ) : (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#00D4FF',
              fontFamily: 'JetBrains Mono, monospace', flexShrink: 0,
            }}>
              {initials}
            </div>
          )}
          <Settings2 size={12} color={tc.settingsGear} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  );
});
