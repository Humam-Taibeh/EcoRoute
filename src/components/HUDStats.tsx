import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { useApp, useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import type { EcoMetrics } from '../types';

// ─── Spring Counter ───────────────────────────────────────────────────────────
function Counter({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  const raf   = useRef(0);
  const from  = useRef(0);
  const start = useRef(0);
  const DURATION = 1400;

  useEffect(() => {
    from.current  = display;
    start.current = performance.now();
    const target  = value;

    const tick = (now: number) => {
      const t    = Math.min((now - start.current) / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(+(from.current + (target - from.current) * ease).toFixed(decimals));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}

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

// ─── Brand Bar ────────────────────────────────────────────────────────────────
export function BrandBar({
  systemReady,
  routeName,
  onSettingsClick,
}: {
  systemReady:     boolean;
  routeName:       string;
  onSettingsClick: () => void;
}) {
  const { profile, language } = useApp();
  const tc = useThemeColors();

  const initials = profile.name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 100, damping: 20 }}
      className="float-top-center"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="panel"
        style={{
          borderRadius: 40, padding: '8px 8px 8px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        {/* Live dot + brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            className="status-live"
            style={{ background: systemReady ? '#00E676' : tc.textMuted }}
          />
          <span style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
            color: tc.brandText, textTransform: 'uppercase',
          }}>
            EcoRoute
          </span>
        </div>

        <div style={{ width: 1, height: 14, background: tc.brandDivider }} />

        {/* Active route */}
        <span style={{ fontSize: 11, color: tc.routeLabel, fontWeight: 400, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {routeName}
        </span>

        <div style={{ width: 1, height: 14, background: tc.brandDivider }} />

        <Clock />

        <div style={{ width: 1, height: 14, background: tc.brandDivider }} />

        {/* Language indicator */}
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          color: language === 'ar' ? '#00D4FF' : tc.langIndicatorInactive,
          textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace',
        }}>
          {language === 'ar' ? 'ع' : 'EN'}
        </span>

        {/* Settings trigger */}
        <button
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
            (e.currentTarget as HTMLElement).style.background  = 'rgba(0,212,255,0.08)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.22)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background  = tc.settingsBtn;
            (e.currentTarget as HTMLElement).style.borderColor = tc.settingsBtnBorder;
          }}
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(0,212,255,0.3)' }}
            />
          ) : (
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(0,212,255,0.12)',
              border: '1px solid rgba(0,212,255,0.25)',
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
}

// ─── Top Right Eco Chips ──────────────────────────────────────────────────────
export function EcoChips({ metrics }: { metrics: EcoMetrics }) {
  const tc = useThemeColors();
  const t  = useT();

  const chips = [
    { label: t.hud.netEnergy, value: metrics.netEnergyKWh,     unit: 'kWh', dec: 3, color: '#00D4FF' },
    { label: t.hud.regen,     value: metrics.regenRecoveryKWh, unit: 'kWh', dec: 3, color: '#00E676' },
    { label: t.hud.co2Saved,  value: metrics.co2SavedKg,       unit: 'kg',  dec: 2, color: '#00E676' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 100, damping: 20 }}
      style={{ position: 'fixed', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 6, width: 220 }}
    >
      {chips.map((chip, i) => (
        <motion.div
          key={chip.label}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 100, damping: 20 }}
          className="panel transition-panel"
          style={{ borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
        >
          <span className="text-label" style={{ fontSize: 10 }}>{chip.label}</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
            <span className="font-data" style={{ fontSize: 14, fontWeight: 500, color: chip.color }}>
              <Counter value={chip.value} decimals={chip.dec} />
            </span>
            <span style={{ fontSize: 10, color: tc.textUnit }}>{chip.unit}</span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ─── HUDStats (combined export) ───────────────────────────────────────────────
export function HUDStats({
  metrics,
  routeName,
  systemReady,
  onSettingsClick,
  hasRoute = true,
}: {
  metrics:         EcoMetrics;
  routeName:       string;
  systemReady:     boolean;
  onSettingsClick: () => void;
  /** Hide EcoChips when no route is active */
  hasRoute?:       boolean;
}) {
  return (
    <>
      <BrandBar systemReady={systemReady} ro