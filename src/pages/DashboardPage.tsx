import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJsApiLoader } from '@react-google-maps/api';
import type { Libraries } from '@react-google-maps/api';
import { Navigation, Navigation2, Zap, Sparkles, SlidersHorizontal, ChevronRight } from 'lucide-react';
import { MapContainer }   from '../components/MapContainer';
import { ElevationChart } from '../components/ElevationChart';
import { HUDStats }       from '../components/HUDStats';
import { SettingsHub }    from '../components/SettingsHub';
import { MetricCard, EcoScoreCard, VehicleCard } from '../components/SidebarCard';
import { AICopilot }      from '../components/AICopilot';
import { SearchPanel }    from '../components/SearchPanel';
import { useEcoPhysics, DEFAULT_VEHICLE } from '../hooks/useEcoPhysics';
import { useRealRoute }   from '../hooks/useRealRoute';
import { useParallax }    from '../hooks/useParallax';
import { useAppLanguage, useAppTheme, useThemeColors } from '../context/AppContext';
import { useT }           from '../i18n';
import { AMMAN_ROUTES, FALLBACK_ALPHA } from '../data/mockRoutes';
import type { VehicleConfig, AmmanRouteConfig, LatLng } from '../types';

// ─── Module-level constants ────────────────────────────────────────────────────
const SPRING: object   = { type: 'spring', stiffness: 120, damping: 20 };
const GMAPS_KEY        = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';
const LIBRARIES: Libraries = ['geometry', 'places'];
const DUMMY_CONFIG     = AMMAN_ROUTES[0];
const BLADE_WIDTH      = 'clamp(290px, 24vw, 360px)';

// ─── Stagger Variants — used in tab content ────────────────────────────────────
const TAB_LIST = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, when: 'beforeChildren' } },
};
const TAB_ITEM = {
  hidden:  { opacity: 0, y: 12, scale: 0.94 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { type: 'spring' as const, bounce: 0.40, duration: 0.52 } },
};

// ─── Boot Screen ───────────────────────────────────────────────────────────────
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
            border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(12px)',
          }}
          animate={{ boxShadow: ['0 0 0 0 rgba(0,212,255,0)', '0 0 0 10px rgba(0,212,255,0.07)', '0 0 0 0 rgba(0,212,255,0)'] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        >
          <Navigation size={26} color="#00D4FF" strokeWidth={1.5} />
        </motion.div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.05em', color: 'rgba(255,255,255,0.94)' }}>EcoRoute</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.15em', marginTop: 6, textTransform: 'uppercase' }}>{t.boot.subtitle}</div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, ...SPRING } as object}
        style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <motion.div
          key={STEPS[step] ?? t.boot.subtitle}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
          style={{ fontSize: 12, letterSpacing: '0.04em', textAlign: 'center', color: 'rgba(255,255,255,0.55)', minHeight: 18 }}
        >
          {STEPS[step] ?? t.boot.subtitle}
        </motion.div>
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

// ─── Side-Blade Right Panel ────────────────────────────────────────────────────
type RightTab = 'route' | 'data' | 'ai' | 'setup';
const RIGHT_TABS: { id: RightTab; icon: typeof Navigation2; key: string }[] = [
  { id: 'route', icon: Navigation2,       key: 'ROUTE' },
  { id: 'data',  icon: Zap,               key: 'DATA'  },
  { id: 'ai',    icon: Sparkles,          key: 'AI'    },
  { id: 'setup', icon: SlidersHorizontal, key: 'SETUP' },
];

interface UnifiedRightPanelProps {
  hasRoute:        boolean;
  activeConfig:    AmmanRouteConfig;
  metrics:         ReturnType<typeof useEcoPhysics>;
  vehicle:         VehicleConfig;
  distance:        number;
  duration:        number;
  onClear:         () => void;
  onVehicleChange: (v: Partial<VehicleConfig>) => void;
  parallaxX:       number;
  parallaxY:       number;
  dir:             'ltr' | 'rtl';
  isOpen:          boolean;
  onToggle:        () => void;
}

function UnifiedRightPanel({
  hasRoute, activeConfig, metrics, vehicle, distance, duration,
  onClear, onVehicleChange, parallaxX, parallaxY, dir,
  isOpen, onToggle,
}: UnifiedRightPanelProps) {
  const [tab, setTab] = useState<RightTab>('route');
  const tc   = useThemeColors();
  const t    = useT();
  const side = dir === 'rtl' ? 'left' : 'right';
  const pxOffset = dir === 'rtl' ? parallaxX * -1.2 : parallaxX * 1.2;

  const prevConfigId = useRef<string>('');
  useEffect(() => {
    if (hasRoute && activeConfig.id !== prevConfigId.current) {
      prevConfigId.current = activeConfig.id;
      setTab('route');
    }
  }, [hasRoute, activeConfig.id]);

  const routeName    = (t.routeNames as Record<string, string>)[activeConfig.id] ?? activeConfig.name;
  const routeDesc    = (t.routeDescs as Record<string, string>)[activeConfig.id] ?? activeConfig.description;
  const trafficColor = activeConfig.trafficLevel === 'low' ? '#00E676'
                     : activeConfig.trafficLevel === 'medium' ? '#F59E0B' : '#EF4444';
  const trafficLabel = activeConfig.trafficLevel === 'low' ? t.traffic.low
                     : activeConfig.trafficLevel === 'medium' ? t.traffic.medium : t.traffic.high;

  return (
    <motion.div
      animate={{ x: isOpen ? 0 : (dir === 'rtl' ? -380 : 380), opacity: isOpen ? 1 : 0.0 }}
      initial={{ opacity: 0, x: dir === 'rtl' ? -32 : 32 }}
      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
      style={{
        position: 'fixed', [side]: 16, top: 64, bottom: 96, zIndex: 10,
        width: BLADE_WIDTH,
        display: 'flex', flexDirection: 'column', gap: 10,
        transform: `translate3d(${pxOffset}px, ${parallaxY * -0.7}px, 0)`,
      }}
    >
      {/* Blade toggle tab */}
      <button
        onClick={onToggle}
        className={`blade-tab${dir === 'rtl' ? ' blade-tab-rtl' : ''}`}
        style={{
          [dir === 'rtl' ? 'right' : 'left']: isOpen ? '-22px' : '-22px',
        }}
        title={isOpen ? 'Collapse panel' : 'Expand panel'}
      >
        <motion.div
          animate={{ rotate: isOpen ? (dir === 'rtl' ? 180 : 0) : (dir === 'rtl' ? 0 : 180) }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        >
          <ChevronRight size={13} color={tc.textDim} />
        </motion.div>
      </button>

      {!hasRoute ? (
        <AICopilot route={null} metrics={metrics} vehicle={vehicle} distance={0} embedded={true} />
      ) : (
        <>
          {/* Tab bar */}
          <div className="panel" style={{ borderRadius: 14, padding: 6, display: 'flex', gap: 4 }}>
            {RIGHT_TABS.map(({ id, icon: Icon, key }) => (
              <motion.button
                key={id}
                whileHover={{ y: -1, scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setTab(id)}
                style={{
                  flex: 1, border: 'none', borderRadius: 9, padding: '8px 4px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  transition: 'all 0.16s', background: tab === id ? tc.tabActiveBg : 'transparent',
                }}
              >
                <Icon size={12} color={tab === id ? tc.textPrimary : tc.textInactive} strokeWidth={tab === id ? 2 : 1.5} />
                <span style={{ fontSize: 7, letterSpacing: '0.10em', textTransform: 'uppercase', fontWeight: 600, color: tab === id ? tc.textSecondary : tc.textInactive, fontFamily: 'JetBrains Mono, monospace' }}>{key}</span>
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <AnimatePresence mode="wait">

              {tab === 'route' && (
                <motion.div key="route"
                  variants={TAB_LIST} initial="hidden" animate="visible"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  {/* Active route card */}
                  <motion.div variants={TAB_ITEM} layout
                    className="panel" style={{ borderRadius: 16, padding: '16px 18px', borderColor: 'rgba(0,212,255,0.22)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: tc.textPrimary, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
                          {routeName}
                        </div>
                        <div style={{ fontSize: 10, color: tc.textDesc, lineHeight: 1.5, letterSpacing: '-0.01em' }}>{routeDesc}</div>
                      </div>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0, marginLeft: 10,
                        background: `conic-gradient(#00D4FF ${activeConfig.ecoRating * 3.6}deg, rgba(255,255,255,0.06) 0)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 8px rgba(0,212,255,0.20)',
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
                        <div key={label} style={{ flex: 1 }}>
                          <span style={{ fontSize: 7, color: tc.textDim, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500, fontFamily: 'JetBrains Mono, monospace' }}>{label}</span>
                          <div style={{ fontSize: 15, fontFamily: 'JetBrains Mono, monospace', color: tc.textPrimary, fontWeight: 600 }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    <div className="divider" style={{ margin: '10px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-label" style={{ fontSize: 8 }}>{t.traffic.title}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: trafficColor, animation: 'breathe 2s ease-in-out infinite' }} />
                        <span className="font-data" style={{ fontSize: 11, color: trafficColor }}>{trafficLabel}</span>
                      </div>
                    </div>

                    <motion.button whileTap={{ scale: 0.94 }}
                      whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                      onClick={onClear}
                      style={{
                        marginTop: 12, width: '100%', padding: '7px 0',
                        background: tc.tabActiveBg, border: `1px solid ${tc.divider}`,
                        borderRadius: 9, cursor: 'pointer', fontSize: 9, color: tc.textSecondary,
                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                        transition: 'background 0.15s',
                      }}>
                      {t.search.clearRoute} ×
                    </motion.button>
                  </motion.div>

                  <motion.div variants={TAB_ITEM} layout>
                    <MetricCard label={t.sidebar.distance} value={distance > 0 ? `${distance.toFixed(1)} km` : '—'}
                      sparkData={[12.2, 13.8, 11.6, 14.0, 13.3, distance || 13.8]} />
                  </motion.div>
                  <motion.div variants={TAB_ITEM} layout>
                    <MetricCard label={t.sidebar.estTime} value={duration > 0 ? `${duration.toFixed(0)} min` : '—'} />
                  </motion.div>
                </motion.div>
              )}

              {tab === 'data' && (
                <motion.div key="data"
                  variants={TAB_LIST} initial="hidden" animate="visible"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <motion.div variants={TAB_ITEM} layout><EcoScoreCard metrics={metrics} /></motion.div>

                  <motion.div variants={TAB_ITEM} layout className="panel" style={{ borderRadius: 14, padding: '16px' }}>
                    <div className="text-label" style={{ marginBottom: 14, fontSize: 8 }}>{t.physics.title}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[
                        { label: t.physics.mghPenalty, val: `${metrics.energyPenaltyKWh.toFixed(3)}`, unit: 'kWh', color: '#F59E0B' },
                        { label: t.physics.regenEta,   val: `${metrics.regenRecoveryKWh.toFixed(3)}`, unit: 'kWh', color: '#00E676' },
                        { label: t.physics.netDraw,    val: `${metrics.netEnergyKWh.toFixed(3)}`,     unit: 'kWh', color: '#00D4FF' },
                        { label: t.physics.co2Offset,  val: `${metrics.co2SavedKg.toFixed(2)}`,       unit: 'kg',  color: '#00E676' },
                      ].map(({ label, val, unit, color }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="text-label" style={{ fontSize: 8 }}>{label}</span>
                          <span>
                            <span className="font-data" style={{ fontSize: 13, color }}>{val}</span>
                            <span style={{ fontSize: 8, color: tc.textUnit, marginLeft: 2 }}>{unit}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  <motion.div variants={TAB_ITEM} layout className="panel" style={{ borderRadius: 12, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span className="text-label" style={{ fontSize: 8 }}>{t.regen.title}</span>
                      <span className="font-data" style={{ fontSize: 14, color: '#00E676' }}>{metrics.efficiencyRating.toFixed(0)}%</span>
                    </div>
                    <div className="progress-track">
                      <motion.div className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${metrics.efficiencyRating}%` }}
                        transition={{ duration: 1.4, delay: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </div>
                  </motion.div>

                  <motion.div variants={TAB_ITEM} layout className="panel" style={{ borderRadius: 12, padding: '14px 16px' }}>
                    <div className="text-label" style={{ fontSize: 8, marginBottom: 12 }}>{t.elevation.title}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="text-label" style={{ fontSize: 7, color: '#F59E0B', marginBottom: 4 }}>{t.elevation.gain}</div>
                        <span className="font-data" style={{ fontSize: 18, fontWeight: 700, color: '#F59E0B' }}>+{metrics.totalElevationGain}</span>
                        <span style={{ fontSize: 10, color: tc.textUnit, marginLeft: 2 }}>m</span>
                      </div>
                      <div style={{ width: 1, background: tc.dividerV }} />
                      <div style={{ flex: 1 }}>
                        <div className="text-label" style={{ fontSize: 7, color: '#00E676', marginBottom: 4 }}>{t.elevation.loss}</div>
                        <span className="font-data" style={{ fontSize: 18, fontWeight: 700, color: '#00E676' }}>−{metrics.totalElevationLoss}</span>
                        <span style={{ fontSize: 10, color: tc.textUnit, marginLeft: 2 }}>m</span>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {tab === 'ai' && (
                <motion.div key="ai"
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.16 }}
                >
                  <AICopilot route={activeConfig} metrics={metrics} vehicle={vehicle} distance={distance} embedded={true} />
                </motion.div>
              )}

              {tab === 'setup' && (
                <motion.div key="setup"
                  variants={TAB_LIST} initial="hidden" animate="visible"
                  exit={{ opacity: 0, y: -8, transition: { duration: 0.14 } }}
                  style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                >
                  <motion.div variants={TAB_ITEM} layout>
                    <VehicleCard
                      mass={vehicle.mass} regenEfficiency={vehicle.regenEfficiency}
                      onMassChange={(mass) => onVehicleChange({ mass })}
                      onRegenChange={(regenEfficiency) => onVehicleChange({ regenEfficiency })}
                    />
                  </motion.div>
                  <motion.div variants={TAB_ITEM} layout>
                    <MetricCard label={t.sidebar.mghPenalty} value={`${metrics.energyPenaltyKWh.toFixed(3)} kWh`}
                      subValue={`${metrics.totalElevationGain}m ${t.sidebar.gain}`} color="#F59E0B" />
                  </motion.div>
                  <motion.div variants={TAB_ITEM} layout>
                    <MetricCard label={t.sidebar.regenOpp} value={`${metrics.totalElevationLoss}m`} color="#00E676" />
                  </motion.div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ─── DashboardPage ─────────────────────────────────────────────────────────────
export function DashboardPage() {
  const { theme }      = useAppTheme();
  const { dir }        = useAppLanguage();

  const [booting,       setBooting]       = useState(true);
  const [systemReady,   setSystemReady]   = useState(false);
  const [vehicle,       setVehicle]       = useState<VehicleConfig>(DEFAULT_VEHICLE);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [elevIdx,       setElevIdx]       = useState(0);
  const [activeConfig,  setActiveConfig]  = useState<AmmanRouteConfig | null>(null);
  const [focusLocation, setFocusLocation] = useState<LatLng | null>(null);
  const [bladeOpen,     setBladeOpen]     = useState(true);

  // Live GPS — AeroMarker
  const [userPosition, setUserPosition] = useState<LatLng | null>(null);
  const [userHeading,  setUserHeading]  = useState(0);
  const [userSpeed,    setUserSpeed]    = useState(0);
  const watchIdRef = useRef<number | null>(null);

  const hasRoute = activeConfig !== null;
  const parallax = useParallax(7);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GMAPS_KEY,
    id:        'gmap',
    libraries: LIBRARIES,
  });

  const realRoute = useRealRoute(activeConfig ?? DUMMY_CONFIG, isLoaded, hasRoute);

  const physicsRoute = useMemo(() => {
    if (!hasRoute || realRoute.elevationProfile.length === 0) return null;
    return {
      id:               activeConfig!.id,
      name:             activeConfig!.name,
      description:      activeConfig!.description,
      distance:         realRoute.distance  || 13,
      estimatedTime:    realRoute.duration  || 20,
      path:             realRoute.path,
      elevationProfile: realRoute.elevationProfile,
      waypoints:        [],
      ecoRating:        activeConfig!.ecoRating,
      trafficLevel:     activeConfig!.trafficLevel,
    };
  }, [hasRoute, activeConfig, realRoute]);

  const metrics = useEcoPhysics(physicsRoute, vehicle);

  const elevationData = useMemo(
    () => realRoute.elevationProfile.length > 0 ? realRoute.elevationProfile : FALLBACK_ALPHA,
    [realRoute.elevationProfile],
  );

  const allPaths = useMemo(() => {
    if (!hasRoute || realRoute.path.length === 0) return [];
    return [{ id: activeConfig!.id, path: realRoute.path }];
  }, [hasRoute, activeConfig, realRoute.path]);

  // Ghost marker — elevation chart hover → map position
  const ghostPosition = useMemo<LatLng | null>(() => {
    if (!hasRoute || realRoute.path.length < 2 || elevationData.length < 2) return null;
    const pathIdx = Math.floor((elevIdx / Math.max(elevationData.length - 1, 1)) * (realRoute.path.length - 1));
    return realRoute.path[Math.min(pathIdx, realRoute.path.length - 1)] ?? null;
  }, [hasRoute, elevIdx, elevationData.length, realRoute.path]);

  // Live GPS watchPosition with enableHighAccuracy: true
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.heading !== null) setUserHeading(pos.coords.heading ?? 0);
        if (pos.coords.speed  !== null) setUserSpeed(pos.coords.speed   ?? 0);
      },
      (err) => console.warn('[EcoRoute] watchPosition error:', err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 500 },
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  const handleBootComplete  = useCallback(() => { setBooting(false); setTimeout(() => setSystemReady(true), 500); }, []);
  const handleVehicleChange = useCallback((update: Partial<VehicleConfig>) => setVehicle((prev) => ({ ...prev, ...update })), []);
  const handleClear         = useCallback(() => setActiveConfig(null), []);
  const handleConfigReady   = useCallback((cfg: AmmanRouteConfig) => setActiveConfig(cfg), []);
  const handleLocationPick  = useCallback((latlng: LatLng) => setFocusLocation(latlng), []);
  const handleBladeToggle   = useCallback(() => setBladeOpen((v) => !v), []);
  const handleElevIdx       = useCallback((i: number) => setElevIdx(i), []);

  const bgColor = theme === 'light' ? '#F0F0F3' : '#050505';

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
        focusLocation={focusLocation}
        userPosition={userPosition}
        userHeading={userHeading}
        userSpeed={userSpeed}
        ghostPosition={ghostPosition}
      />

      {/* Settings */}
      <SettingsHub isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* UI panels */}
      <AnimatePresence>
        {!booting && (
          <>
            <HUDStats
              systemReady={systemReady}
              onSettingsClick={() => setSettingsOpen((v) => !v)}
            />

            <SearchPanel
              isLoaded={isLoaded}
              onConfigReady={handleConfigReady}
              onLocationPick={handleLocationPick}
              onClear={handleClear}
              hasRoute={hasRoute}
              loading={realRoute.loading}
            />

            {/* Collapsible Side-Blade (spring 120/20) */}
            <UnifiedRightPanel
              hasRoute={hasRoute}
              activeConfig={activeConfig ?? DUMMY_CONFIG}
              metrics={metrics}
              vehicle={vehicle}
              distance={realRoute.distance}
              duration={realRoute.duration}
              onClear={handleClear}
              onVehicleChange={handleVehicleChange}
              parallaxX={parallax.x}
              parallaxY={parallax.y}
              dir={dir}
              isOpen={bladeOpen}
              onToggle={handleBladeToggle}
            />

            {/* Elevation chart with ghost marker sync */}
            <AnimatePresence>
              {hasRoute && (
                <ElevationChart
                  key="ec"
                  data={elevationData}
                  metrics={metrics}
                  activeIndex={elevIdx}
                  onIndexChange={handleElevIdx}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
