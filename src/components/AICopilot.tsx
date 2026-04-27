import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, Bot } from 'lucide-react';
import { getEcoInsight, getWelcomeInsight } from '../services/geminiService';
import { useApp, useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import type { EcoMetrics, AmmanRouteConfig, VehicleConfig } from '../types';

const SPRING = { type: 'spring', stiffness: 100, damping: 20 } as const;

// ─── Typing Animation ─────────────────────────────────────────────────────────
function TypedText({ text, onDone }: { text: string; onDone?: () => void }) {
  const [displayed, setDisplayed] = useState('');
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
        setTimeout(() => setCursor(false), 1400);
      }
    }, 18);
    return () => clearInterval(id);
  }, [text, onDone]);

  return (
    <span style={{ lineHeight: 1.6 }}>
      {displayed}
      {cursor && (
        <span
          style={{
            display: 'inline-block',
            width: 1.5,
            height: '0.85em',
            background: '#00D4FF',
            marginLeft: 2,
            verticalAlign: 'text-top',
            animation: 'breathe 0.8s step-end infinite',
          }}
        />
      )}
    </span>
  );
}

// ─── AICopilot Component ──────────────────────────────────────────────────────
interface AICopilotProps {
  /** Pass null when no route is selected — triggers welcome insight instead */
  route:      AmmanRouteConfig | null;
  metrics:    EcoMetrics;
  vehicle:    VehicleConfig;
  distance:   number;
  parallaxX?: number;
  parallaxY?: number;
}

export function AICopilot({
  route,
  metrics,
  vehicle,
  distance,
  parallaxX = 0,
  parallaxY = 0,
}: AICopilotProps) {
  const { language } = useApp();
  const tc = useThemeColors();
  const t  = useT();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(false);
  const prevRouteId  = useRef<string>('');
  const prevLanguage = useRef<string>('');
  const fetchId      = useRef(0);

  // ── Welcome mode (no route selected) ─────────────────────────────────────
  const fetchWelcome = useCallback(async () => {
    const myId = ++fetchId.current;
    setLoading(true);
    setError(false);
    setInsight('');
    try {
      const text = await getWelcomeInsight(language);
      if (fetchId.current === myId) setInsight(text.trim());
    } catch {
      if (fetchId.current === myId) setInsight(t.welcome.subtitle);
    } finally {
      if (fetchId.current === myId) setLoading(false);
    }
  }, [language, t.welcome.subtitle]);

  // ── Route insight mode ────────────────────────────────────────────────────
  const fetchInsight = useCallback(async (forceRefresh = false) => {
    if (!route || loading) return;
    if (!forceRefresh && route.id === prevRouteId.current && language === prevLanguage.current && insight) return;

    prevRouteId.current  = route.id;
    prevLanguage.current = language;
    const myId = ++fetchId.current;

    setLoading(true);
    setError(false);
    setInsight('');

    try {
      const text = await getEcoInsight(route, metrics, distance, vehicle.mass, vehicle.regenEfficiency, language);
      if (fetchId.current === myId) setInsight(text.trim());
    } catch {
      if (fetchId.current === myId) {
        setError(true);
        setInsight(t.ai.error);
      }
    } finally {
      if (fetchId.current === myId) setLoading(false);
    }
  }, [route, metrics, distance, vehicle, loading, insight, language, t.ai.error]);

  // Trigger appropriate fetch when route or language changes
  useEffect(() => {
    if (!route) {
      fetchWelcome();
    } else {
      fetchInsight(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.id ?? 'null', language]);

  // Refresh insight when physics metrics change significantly (route loaded)
  const metricsKey = `${metrics.ecoScore.toFixed(0)}-${metrics.regenRecoveryKWh.toFixed(2)}`;
  const prevMetricsKey = useRef('');
  useEffect(() => {
    if (!route) return;
    if (prevMetricsKey.current && prevMetricsKey.current !== metricsKey && !loading) {
      const tm = setTimeout(() => fetchInsight(true), 600);
      return () => clearTimeout(tm);
    }
    prevMetricsKey.current = metricsKey;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsKey]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.4, ...SPRING }}
      style={{
        position: 'fixed',
        bottom: 170,
        left: 16,
        width: 260,
        zIndex: 10,
        transform: `translate3d(${parallaxX * -1.4}px, ${parallaxY * -0.8}px, 0)`,
        transition: 'transform 0.1s linear',
      }}
    >
      <div
        className="panel"
        style={{
          borderRadius: 14,
          padding: '14px 16px',
          borderColor: error ? 'rgba(239,68,68,0.2)' : undefined,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Bot size={13} color="#00D4FF" strokeWidth={1.5} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: tc.aiTitle }}>
              {t.ai.title}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              >
                <Sparkles size={11} color="rgba(0,212,255,0.5)" />
              </motion.div>
            )}
            <button
              onClick={() => route ? fetchInsight(true) : fetchWelcome()}
              disabled={loading}
              title={t.ai.refresh}
              style={{
                background: 'none', border: 'none',
                cursor: loading ? 'default' : 'pointer',
                padding: 2,
                opacity: loading ? 0.3 : 0.6,
                display: 'flex',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '1'; }}
              onMouseLeave={(e) => { if (!loading) (e.currentTarget as HTMLElement).style.opacity = '0.6'; }}
            >
              <RefreshCw size={11} color={tc.textSecondary} />
            </button>
          </div>
        </div>

        <div className="divider" style={{ marginBottom: 10 }} />

        <div style={{ minHeight: 52 }}>
          <AnimatePresence mode="wait">
            {loading && !insight && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                {[80, 95, 60].map((w, i) => (
                  <div key={i} className="skelet