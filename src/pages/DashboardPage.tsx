import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJsApiLoader } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { Navigation, BarChart3, Settings2 } from 'lucide-react';
import { MapContainer } from '../components/MapContainer';
import { ElevationChart } from '../components/ElevationChart';
import { HUDStats } from '../components/HUDStats';
import { SettingsHub } from '../components/SettingsHub';
import { MetricCard, EcoScoreCard, VehicleCard } from '../components/SidebarCard';
import { AICopilot } from '../components/AICopilot';
import { SearchPanel } from '../components/SearchPanel';
import { useEcoPhysics, DEFAULT_VEHICLE } from '../hooks/useEcoPhysics';
import { useRealRoute } from '../hooks/useRealRoute';
import { useParallax } from '../hooks/useParallax';
import { useApp, useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import { AMMAN_ROUTES, FALLBACK_ALPHA } from '../data/mockRoutes';
import type { VehicleConfig, AmmanRouteConfig } from '../types';

// ─── Module-level constants — stable refs, never recreated ──────────────────
const SPRING: object = { type: 'spring', stiffness: 100, damping: 20 };
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: Libraries = ['geometry', 'places'];
// Dummy config used when the custom slot is disabled (never fetched)
const DUMMY_CONFIG = AMMAN_ROUTES[0];

// ─── Boot Screen ──────────────────────────────────────────────────────────────
function BootScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const t = useT();
  const STEPS = t.boot.steps;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const advance = useCallback(() => {
    setStep((prev) => {
      if (prev >= STEPS.length - 1) { setTimeout(onComplete, 500); return prev; }
      setTimeout(advance, 340);
      return prev + 1;
    });
  }, [onComplete, STEPS.length]);

  useEffect(() => {
    const tm = setTimeout(advance, 500);
    return () => clearTimeout(tm);
  }, [advance]);

  return (
    <motion.div className="boot-screen" exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ ...SPRING, delay: 0.1 } as object}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}
      >
        <motion.div
          style={{
            width: 60, height: 60, borderRadius: 18,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)',
          }}
          animate={{ boxShadow: ['0 0 0 0 rgba(0,212,255,0)', '0 0 0 10px rgba(0,212,255,0.06)', '0 0 0 0 rgba(0,212,255,0)'] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <Navigation size={26} color="#00D4FF" strokeWidth={1.5} />
        </motion.div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.04em', color: 'rgba(255,255,255,0.92)' }}>EcoRoute</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', marginTop: 6 }}>{t.boot.subtitle}</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ...SPRING } as object}
        style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 6 }}
      >
        {STEPS.map((s, i) => (
          <motion.div key={s} animate={{ opacity: step >= i ? 1 : 0.18 }} transition={{ duration: 0.3 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
            <motion.div
              animate={{ background: step > i ? '#00E676' : step === i ? '#00D4FF' : 'rgba(255,255,255,0.12)' }}
              transition={{ duration: 0.3 }}
              style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0 }}
            />
            <span style={{ fontSize: 12, color: step >= i ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.18)' }}>{s}</span>
            {step > i && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginLeft: 'auto', fontSize: 10, color: '#00E676' }}>
                {t.boot.done}
              </motion.span>
            )}
          </motion.div>
        ))}
      </motion.div>

      <div style={{ width: 280 }}>
        <div className="progress-track">
          <motion.div className="progress-fill"
            animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type Tab = 'routes' | 'metrics' | 'vehicle';

// ─── Left Sidebar ─────────────────────────────────────────────────────────────
interface LeftSidebarProps {
  activeConfig: AmmanRouteConfig;
  metrics: ReturnType<typeof useEcoPhysics>;
  vehicle: VehicleConfig;
  distance: number;
  duration: number;
  onClear: () => void;
  onVehicleChange: (v: Partial<VehicleConfig>) => void;
  parallaxX: number;
  parallaxY: number;
  dir: 'ltr' | 'rtl';
}

function LeftSidebar({
  activeConfig, metrics, vehicle, distance, duration,
  onClear, onVehicleChange, parallaxX, parallaxY, dir,
}: LeftSidebarProps) {
  const [tab, setTab] = useState<Tab>('routes');
  const tc  = useThemeColors();
  const t   = useT();
  const side     = dir === 'rtl' ? 'right' : 'left';
  const pxOffset = dir === 'rtl' ? parallaxX * 1.2 : parallaxX * -1.2;

  // Translated route name and description
  const routeName = (t.routeNames as Record<string, string>)[activeConfig.id] ?? activeConfig.name;
  const routeDesc = (t.routeDescs as Record<string, string>)[activeConfig.id] ?? activeConfig.description;

  const TABS: { id: Tab; icon: typeof Navigation; label: string }[] = [
    { id: 'routes',  icon: Navigation, label: t.tabs.routes  },
    { id: 'metrics', icon: BarChart3,   label: t.tabs.metrics },
    { id: 'vehicle', icon: Settings2,   label: t.tabs.vehicle },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'rtl' ? 22 : -22 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'rtl' ? 22 : -22 }}
      transition={{ ...SPRING } as object}
      style={{
        position: 'fixed', [side]: 16, top: 64, bottom: 170, zIndex: 10,
        width: 260, display: 'flex', flexDirection: 'column', gap: 8,
        transform: `translate3d(${pxOffset}px, ${parallaxY * -0.7}px, 0)`,
        transition: 'transform 0.1s linear',
      }}
    >
      {/* Tab bar */}
      <div className="panel" style={{ borderRadius: 12, padding: 5, display: 'flex', gap: 3 }}>
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              flex: 1, border: 'none', borderRadius: 9, padding: '8px 4px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              transition: 'all 0.18s', background: tab === id ? tc.tabActiveBg : 'transparent',
            }}
          >
            <Icon size={13} color={tab === id ? tc.textPrimary : tc.textInactive} strokeWidth={tab === id ? 2 : 1.5} />
            <span style={{ fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500, color: tab === id ? tc.textSecondary : tc.textInactive }}>
              {label}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <AnimatePresence mode="wait">

          {tab === 'routes' && (
            <motion.div key="r" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>

              {/* Active route summary card */}
              <div className="panel" style={{ borderRadius: 14, padding: '14px 16px', borderColor: 'rgba(0,212,255,0.22)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: tc.textPrimary, letterSpacing: '-0.01em',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                      {routeName}
                    </div>
                    <div style={{ fontSize: 9, color: tc.textDesc, lineHeight: 1.5 }}>{routeDesc}</div>
                  </div>
                  {/* Eco rating dot */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginLeft: 10,
                    background: `conic-gradient(#00D4FF ${activeConfig.ecoRating * 3.6}deg, rgba(255,255,255,0.06) 0)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 8, fontFamily: 'JetBrains Mono, monospace', color: '#00D4FF', fontWeight: 700 }}>
                      {activeConfig.ecoRating}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  {[
                    { label: t.route.dist, val: distance > 0 ? `${distance.toFixed(1)} km` : '—' },
                    { label: t.route.eta,  val: duration > 0 ? `${duration.toFixed(0)} min` : '—' },
                    { label: t.route.eco,  val: `${activeConfig.ecoRating}/100` },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 7, color: tc.textDim, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        {label}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: tc.textPrimary, fontWeight: 500 }}>
                        {val}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Clear route button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClear}
                  style={{
                    marginTop: 12, width: '100%', padding: '7px 0',
                    background: tc.tabActiveBg, border: `1px solid ${tc.divider}`,
                    borderRadius: 9, cursor: 'pointer', fontSize: 10, color: tc.textSecondary,
                    fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                    transition: 'background 0.15s',
                  }}
                >
                  {t.search.clearRoute} ×
                </motion.button>
              </div>

              <div style={{ height: 2 }} />
              <MetricCard label={t.sidebar.distance} value={distance > 0 ? `${distance.toFixed(1)} km` : '—'} delay={0.06}
                sparkData={[12.2, 13.8, 11.6, 14.0, 13.3, distance || 13.8]} />
              <MetricCard label={t.sidebar.estTime} value={duration > 0 ? `${duration.toFixed(0)} min` : '—'} delay={0.10} />
            </motion.div>
          )}

          {tab === 'metrics' && (
            <motion.div key="m" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <EcoScoreCard metrics={metrics} />
              <MetricCard label={t.metrics.netEnergy} value={`${metrics.netEnergyKWh.toFixed(3)} kWh`} color="#00D4FF" delay={0.06}
                sparkData={[0.52, 0.48, 0.50, 0.44, 0.41, metrics.netEnergyKWh]} />
              <MetricCard label={t.metrics.regenRecovery} value={`${metrics.regenRecoveryKWh.toFixed(3)} kWh`}
                subValue={`${t.sidebar.efficiency} = ${metrics.efficiencyRating.toFixed(1)}%`} color="#00E676" delay={0.1} />
              <MetricCard label={t.metrics.co2Saved} value={`${metrics.co2SavedKg.toFixed(2)} kg`} color="#00E676" delay={0.14} />
            </motion.div>
          )}

          {tab === 'vehicle' && (
            <motion.div key="v" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <VehicleCard mass={vehicle.mass} regenEfficiency={vehicle.regenEfficiency}
                onMassChange={(mass) => onVehicleChange({ mass })}
                onRegenChange={(regenEfficiency) => onVehicleChange({ regenEfficiency })} />
              <MetricCard label={t.sidebar.mghPenalty} value={`${metrics.energyPenaltyKWh.toFixed(3)} kWh`}
                subValue={`${metrics.totalElevationGain}m ${t.sidebar.gain}`} color="#F59E0B" delay={0.08} />
              <MetricCard label={t.sidebar.regenOpp} value={`${metrics.totalElevationLoss}m`} color="#00E676" delay={0.12} />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Right Stats Panel ────────────────────────────────────────────────────────
function RightPanel({
  metrics, activeConfig, parallaxX, parallaxY, dir,
}: {
  metrics: ReturnType<typeof useEcoPhysics>;
  activeConfig: AmmanRouteConfig;
  parallaxX: number;
  parallaxY: number;
  dir: 'ltr' | 'rtl';
}) {
  const tc = useThemeColors();
  const t  = useT();
  const side     = dir === 'rtl' ? 'left'  : 'right';
  const pxOffset = dir === 'rtl' ? parallaxX * -1.2 : parallaxX * 1.2;

  const trafficLabel = activeConfig.trafficLevel === 'low'
    ? t.traffic.low
    : activeConfig.trafficLevel === 'medium'
    ? t.traffic.medium
    : t.traffic.high;

  return (
    <motion.div
      initial={{ opacity: 0, x: dir === 'rtl' ? -22 : 22 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: dir === 'rtl' ? -22 : 22 }}
      transition={{ delay: 0.05, ...SPRING } as object}
      style={{
        position: 'fixed', [side]: 16, top: 64, bottom: 170, zIndex: 10,
        width: 220, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto',
        transform: `translate3d(${pxOffset}px, ${parallaxY * -0.7}px, 0)`,
        transition: 'transform 0.1s linear',
      }}
    >
      <div className="panel" style={{ borderRadius: 14, padding: '16px' }}>
        <div className="text-label" style={{ marginBottom: 14, fontSize: 9 }}>{t.physics.title}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: t.physics.mghPenalty, val: `${metrics.energyPenaltyKWh.toFixed(3)}`, unit: 'kWh', color: '#F59E0B' },
            { label: t.physics.regenEta,   val: `${metrics.regenRecoveryKWh.toFixed(3)}`, unit: 'kWh', color: '#00E676' },
            { label: t.physics.netDraw,    val: `${metrics.netEnergyKWh.toFixed(3)}`,     unit: 'kWh', color: '#00D4FF' },
            { label: t.physics.co2Offset,  val: `${metrics.co2SavedKg.toFixed(2)}`,       unit: 'kg',  color: '#00E676' },
          ].map(({ label, val, unit, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-label" style={{ fontSize: 9 }}>{label}</span>
              <span>
                <span className="font-data" style={{ fontSize: 13, color }}>{val}</span>
                <span style={{ fontSize: 9, color: tc.textUnit, marginLeft: 2 }}>{unit}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="panel" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="text-label" style={{ fontSize: 9 }}>{t.regen.title}</span>
          <span className="font-data" style={{ fontSize: 14, color: '#00E676' }}>{metrics.efficiencyRating.toFixed(0)}%</span>
        </div>
        <div className="progress-track">
          <motion.div className="progress-fill"
            initial={{ width: 0 }}
            animate={{ width: `${metrics.efficiencyRating}%` }}
            transition={{ duration: 1.4, delay: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
          />
        </div>
      </div>

      <div className="panel" style={{ borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-label" style={{ fontSize: 9 }}>{t.traffic.title}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%', animation: 'breathe 2s ease-in-out infinite',
              background: activeConfig.trafficLevel === 'low' ? '#00E676' : activeConfig.trafficLevel === 'medium' ? '#F59E0B' : '#EF4444',
            }} />
            <span className="font-data" style={{
              fontSize: 11, fontWeight: 500,
              color: activeConfig.trafficLevel === 'low' ? '#00E676' : activeConfig.trafficLevel === 'medium' ? '#F59E0B' : '#EF4444',
            }}>
              {trafficLabel}
            </span>
          </div>
        </div>
        <div className="divider" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="text-label" style={{ fontSize: 9 }}>{t.score.title}</span>
          <span className="font-data" style={{ fontSize: 15, color: metrics.ecoScore >= 75 ? '#00E676' : '#00D4FF' }}>
            {metrics.ecoScore.toFixed(0)}
          </span>
        </div>
      </div>

      <div className="panel" style={{ borderRadius: 12, padding: '14px 16px' }}>
        <div className="text-label" style={{ fontSize: 9, marginBottom: 12 }}>{t.elevation.title}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div className="text-label" style={{ fontSize: 8, color: '#F59E0B', marginBottom: 4 }}>{t.elevation.gain}</div>
            <span className="font-data" style={{ fontSize: 18, color: '#F59E0B' }}>+{metrics.totalElevationGain}</span>
            <span style={{ fontSize: 10, color: tc.textUnit, marginLeft: 2 }}>m</span>
          </div>
          <div style={{ width: 1, background: tc.dividerV }} />
          <div style={{ flex: 1 }}>
            <div className="text-label" style={{ fontSize: 8, color: '#00E676', marginBottom: 4 }}>{t.elevation.loss}</div>
            <span className="font-data" style={{ fontSize: 18, color: '#00E676' }}>−{metrics.totalElevationLoss}</span>
            <span style={{ fontSize: 10, color: tc.textUnit, marginLeft: 2 }}>m</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── DashboardPage ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { theme, dir } = useApp();
  const t = useT();

  const [booting, setBooting]           = useState(true);
  const [systemReady, setSystemReady]   = useState(false);
  const [vehicle, setVehicle]           = useState<VehicleConfig>(DEFAULT_VEHICLE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [elevIdx, setElevIdx]           = useState(0);

  // ── Clean Slate: no route until user searches ──────────────────────────────
  const [activeConfig, setActiveConfig] = useState<AmmanRouteConfig | null>(null);
  const hasRoute = activeConfig !== null;

  const parallax = useParallax(7);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GMAPS_KEY,
    id:        'gmap',
    libraries: LIBRARIES,
  });

  // ── Single route hook — only fetches when hasRoute ─────────────────────────
  const realRoute = useRealRoute(activeConfig ?? DUMMY_CONFIG, isLoaded, hasRoute);

  // ── Active display name (translated for preset routes) ────────────────────
  const activeDisplayName = useMemo(() => {
    if (!activeConfig) return t.welcome.selectRoute;
    if (activeConfig.id === 'live') return activeConfig.name;
    return (t.routeNames as Record<string, string>)[activeConfig.id] ?? activeConfig.name;
  }, [activeConfig, t]);

  // ── Route object for physics engine ──────────────────────────────────────
  const physicsRoute = useMemo(() => {
    if (!hasRoute || realRoute.elevationProfile.length === 0) return null;
    return {
      id:              activeConfig!.id,
      name:            activeConfig!.name,
      description:     activeConfig!.description,
      distance:        realRoute.distance  || 13,
      estimatedTime:   realRoute.duration  || 20,
      path:            realRoute.path,
      elevationProfile: realRoute.elevationProfile,
      waypoints:       [],
      ecoRating:       activeConfig!.ecoRating,
      trafficLevel:    activeConfig!.trafficLevel,
    };
  }, [hasRoute, activeConfig, realRoute]);

  const metrics = useEcoPhysics(physicsRoute, vehicle);

  // ── Elevation data (safe fallback prevents chart crash) ───────────────────
  const elevationData = useMemo(() =>
    realRoute.elevationProfile.length > 0 ? realRoute.elevationProfile : FALLBACK_ALPHA,
  [realRoute.elevationProfile]);

  // ── All path slots for the map overlay ────────────────────────────────────
  const allPaths = useMemo(() => {
    if (!hasRoute || realRoute.path.length === 0) return [];
    return [{ id: activeConfig!.id, path: realRoute.path }];
  }, [hasRoute, activeConfig, realRoute.path]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleBootComplete = useCallback(() => {
    setBooting(false);
    setTimeout(() => setSystemReady(true), 500);
  }, []);

  const handleVehicleChange = useCallback((update: Partial<VehicleConfig>) => {
    setVehicle((prev) => ({ ...prev, ...update }));
  }, []);

  const handleClear = useCallback(() => {
    setActiveConfig(null);
  }, []);

  const handleConfigReady = useCallback((cfg: AmmanRouteConfig) => {
    setActiveConfig(cfg);
  }, []);

  const bgColor = theme === 'light' ? '#F5F5F7' : '#050505';

  return (
    <div style={{ position: 'fixed', inset: 0, background: bgColor, overflow: 'hidden' }}>

      {/* Boot screen */}
      <AnimatePresence>
        {booting && <BootScreen onComplete={handleBootComplete} />}
      </AnimatePresence>

      {/* Full-viewport map */}
      <MapContainer
        isLoaded={isLoaded}
        loadError={loadError}
        activeRouteConfig={activeConfig ?? DUMMY_CONFIG}
        activePath={realRoute.path}
        allPaths={allPaths}
        routeError={activeConfig ? realRoute.error : null}
      />

      {/* Settings hub */}
      <SettingsHub isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* ── UI panels (shown after boot) ─────────────────────────────────── */}
      <AnimatePresence>
        {!booting && (
          <>
            {/* Brand bar + conditional eco chips */}
            <HUDStats
              metrics={metrics}
              routeName={activeDisplayName}
              systemReady={systemReady}
              onSettingsClick={() => setSettingsOpen((v) => !v)}
              hasRoute={hasRoute}
            />

            {/* Dual search panel — always visible */}
            <SearchPanel
              isLoaded={isLoaded}
              onConfigReady={handleConfigReady}
              onClear={handleClear}
              hasRoute={hasRoute}
              loading={realRoute.loading}
            />

            {/* Sidebar, right panel, elevation chart — only when route active */}
            <AnimatePresence>
              {hasRoute && (
                <>
                  <LeftSidebar
                    key="ls"
                    activeConfig={activeConfig!}
                    metrics={metrics}
                    vehicle={vehicle}
                    distance={realRoute.distance}
                    duration={realRoute.duration}
                    onClear={handleClear}
                    onVehicleChange={handleVehicleChange}
                    parallaxX={parallax.x}
                    parallaxY={parallax.y}
                    dir={dir}
                  />

                  <RightPanel
                    key="rp"
                    metrics={metrics}
                    activeConfig={activeConfig!}
                    parallaxX={parallax.x}
                    p