import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation2, LocateFixed, X, Loader2 } from 'lucide-react';
import { useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import { AMMAN_ROUTES } from '../data/mockRoutes';
import type { AmmanRouteConfig, LatLng } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
interface NamedPoint { latlng: LatLng; name: string }

export interface SearchPanelProps {
  isLoaded:       boolean;
  onConfigReady:  (cfg: AmmanRouteConfig) => void;
  onClear:        () => void;
  hasRoute:       boolean;
  loading:        boolean;
}

// Build a live custom route config from two named points
function buildLiveConfig(origin: NamedPoint, dest: NamedPoint): AmmanRouteConfig {
  return {
    id:             'live',
    name:           dest.name,
    description:    `${origin.name} → ${dest.name}`,
    ecoRating:      75,
    trafficLevel:   'medium',
    origin:         origin.latlng,
    destination:    dest.latlng,
    waypointCoords: [],
    waypointLabels: [origin.name, dest.name],
    landmarks:      [origin.name, dest.name, 'Downtown Amman', 'Jabal Amman'],
  };
}

// ─── SearchPanel ──────────────────────────────────────────────────────────────
export function SearchPanel({ isLoaded, onConfigReady, onClear, hasRoute, loading }: SearchPanelProps) {
  const tc = useThemeColors();
  const t  = useT();

  const [originVal, setOriginVal] = useState('');
  const [destVal,   setDestVal]   = useState('');
  const [locating,  setLocating]  = useState(false);
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused,   setDestFocused]   = useState(false);

  // Use refs to track current values in stable callbacks
  const originRef = useRef<NamedPoint | null>(null);
  const destRef   = useRef<NamedPoint | null>(null);

  const originInputRef = useRef<HTMLInputElement>(null);
  const destInputRef   = useRef<HTMLInputElement>(null);
  const originACRef    = useRef<google.maps.places.Autocomplete | null>(null);
  const destACRef      = useRef<google.maps.places.Autocomplete | null>(null);
  const onConfigReadyRef = useRef(onConfigReady);
  onConfigReadyRef.current = onConfigReady;

  // Try to emit config when both points are known
  const tryEmit = useCallback((o: NamedPoint | null, d: NamedPoint | null) => {
    if (o && d) onConfigReadyRef.current(buildLiveConfig(o, d));
  }, []);

  // ── Autocomplete init ──────────────────────────────────────────────────────
  const initAC = useCallback(() => {
    if (!isLoaded || !window.google?.maps?.places?.Autocomplete) return;

    const opts: google.maps.places.AutocompleteOptions = {
      types:                 ['geocode', 'establishment'],
      componentRestrictions: { country: 'jo' },
      fields:                ['geometry', 'name', 'formatted_address'],
    };

    if (originInputRef.current && !originACRef.current) {
      const ac = new window.google.maps.places.Autocomplete(originInputRef.current, opts);
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p.geometry?.location) return;
        const named: NamedPoint = {
          latlng: { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() },
          name:   p.name ?? p.formatted_address ?? t.search.originPlaceholder,
        };
        originRef.current = named;
        setOriginVal(named.name);
        tryEmit(named, destRef.current);
      });
      originACRef.current = ac;
    }

    if (destInputRef.current && !destACRef.current) {
      const ac = new window.google.maps.places.Autocomplete(destInputRef.current, opts);
      ac.addListener('place_changed', () => {
        const p = ac.getPlace();
        if (!p.geometry?.location) return;
        const named: NamedPoint = {
          latlng: { lat: p.geometry.location.lat(), lng: p.geometry.location.lng() },
          name:   p.name ?? p.formatted_address ?? t.search.destPlaceholder,
        };
        destRef.current = named;
        setDestVal(named.name);
        tryEmit(originRef.current, named);
      });
      destACRef.current = ac;
    }
  }, [isLoaded, t.search.originPlaceholder, t.search.destPlaceholder, tryEmit]);

  useEffect(() => { initAC(); }, [initAC]);
  useEffect(() => {
    if (!isLoaded) { originACRef.current = null; destACRef.current = null; }
  }, [isLoaded]);

  // ── My Location (Geolocation API) ─────────────────────────────────────────
  const handleMyLocation = useCallback(() => {
    if (!navigator.geolocation || locating) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const named: NamedPoint = {
          latlng: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          name:   t.search.myLocation,
        };
        originRef.current = named;
        setOriginVal(named.name);
        setLocating(false);
        tryEmit(named, destRef.current);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [locating, t.search.myLocation, tryEmit]);

  // ── Quick route preset ─────────────────────────────────────────────────────
  const handleQuickRoute = useCallback((r: AmmanRouteConfig) => {
    const wps         = (t.waypointLabels as Record<string, string[]>)[r.id] ?? r.waypointLabels;
    const originLabel = wps[0] ?? r.waypointLabels[0];
    const destLabel   = wps[wps.length - 1] ?? r.waypointLabels[r.waypointLabels.length - 1];

    originRef.current = { latlng: r.origin, name: originLabel };
    destRef.current   = { latlng: r.destination, name: destLabel };
    setOriginVal(originLabel);
    setDestVal(destLabel);

    // Pass full preset config (preserves waypoints for accurate routing)
    onConfigReadyRef.current(r);
  }, [t.waypointLabels]);

  // ── Clear ──────────────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    originRef.current = null;
    destRef.current   = null;
    setOriginVal('');
    setDestVal('');
    // Reset the input DOM values (Autocomplete may have set them directly)
    if (originInputRef.current) originInputRef.current.value = '';
    if (destInputRef.current)   destInputRef.current.value   = '';
    onClear();
  }, [onClear]);

  // ── Shared styles ──────────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    flex:       1,
    background: 'none',
    border:     'none',
    outline:    'none',
    fontSize:   12,
    color:      tc.textPrimary,
    fontFamily: 'Inter, -apple-system, sans-serif',
    minWidth:   0,
  };

  const rowBg = (focused: boolean) => focused
    ? 'rgba(0,212,255,0.06)'
    : tc.settingsInput;
  const rowBorder = (focused: boolean) => `1px solid ${focused ? 'rgba(0,212,255,0.28)' : tc.divider}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.38, type: 'spring', stiffness: 120, damping: 20 }}
      style={{
        position:  'fixed',
        top:       66,
        left:      '50%',
        transform: 'translateX(-50%)',
        zIndex:    12,
        width:     460,
        maxWidth:  'calc(100vw - 32px)',
      }}
    >
      <div
        className="panel"
        style={{ borderRadius: 20, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}
      >
        {/* ── Origin row ──────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 11px', borderRadius: 11,
            background: rowBg(originFocused),
            border: rowBorder(originFocused),
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <Navigation2 size={12} color="#00D4FF" style={{ flexShrink: 0 }} />
          <input
            ref={originInputRef}
            type="text"
            className="eco-search-input"
            value={originVal}
            onChange={(e) => setOriginVal(e.target.value)}
            onFocus={() => setOriginFocused(true)}
            onBlur={() => setOriginFocused(false)}
            placeholder={t.search.originPlaceholder}
            autoComplete="off"
            style={inputStyle}
          />
          {/* GPS / My Location button */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={handleMyLocation}
            title={t.search.myLocation}
            style={{
              flexShrink: 0, background: 'none',
              border: `1px solid rgba(0,212,255,0.22)`,
              borderRadius: 8, padding: '3px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            {locating ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ display: 'flex' }}
              >
                <Loader2 size={10} color="#00D4FF" />
              </motion.div>
            ) : (
              <LocateFixed size={10} color="#00D4FF" />
            )}
            <span style={{
              fontSize: 8, color: '#00D4FF',
              fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', fontWeight: 600,
            }}>
              GPS
            </span>
          </motion.button>
        </div>

        {/* ── Connector dot ─────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingInlineStart: 17 }}>
          <div style={{ width: 1, height: 8, background: tc.divider }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: tc.textDim }} />
          <div style={{ flex: 1, height: 1, background: 'transparent' }} />
        </div>

        {/* ── Destination row ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 11px', borderRadius: 11,
            background: rowBg(destFocused),
            border: rowBorder(destFocused),
            transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <MapPin size={12} color={tc.textSecondary} style={{ flexShrink: 0 }} />
          <input
            ref={destInputRef}
            type="text"
            className="eco-search-input"
            value={destVal}
            onChange={(e) => setDestVal(e.target.value)}
            onFocus={() => setDestFocused(true)}
            onBlur={() => setDestFocused(false)}
            placeholder={t.search.destPlaceholder}
            autoComplete="off"
            style={inputStyle}
          />
          {/* Loading spinner */}
          <AnimatePresence>
            {loading && (
              <motion.div
                key="spin"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                style={{ flexShrink: 0, display: 'flex' }}
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={12} color="#00D4FF" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Clear button */}
          <AnimatePresence>
            {hasRoute && !loading && (
              <motion.button
                key="clear"
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleClear}
                title={t.search.clearRoute}
                style={{
                  flexShrink: 0, background: tc.settingsInput,
                  border: `1px solid ${tc.divider}`,
                  borderRadius: 7, padding: '4px 8px',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <X size={10} color={tc.textDim} />
                <span style={{
                  fontSize: 8, color: tc.textDim,
                  fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                }}>
                  {t.search.clearRoute}
                </span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── Quick route pills ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 2 }}>
          <span style={{
            fontSize: 8, color: tc.textDim,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', flexShrink: 0,
          }}>
            {t.search.quickRoutes}
          </span>
          {AMMAN_ROUTES.map((r) => {
            const label = ((t.routeNames as Record<string, string>)[r.id] ?? r.name).split(' — ')[0];
            return (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.91 }}
                onClick={() => handleQuickRoute(r)}
                style={{
                  background:   tc.tabActiveBg,
                  border:       `1px solid ${tc.divider}`,
                  borderRadius: 8,
                  padding:      '4px 10px',
                  cursor:       'pointer',
                  fontSize:     9,
                  color:        tc.textSecondary,
                  fontFamily:   'JetBrains Mono, monospace',
                  letterSpacing:'0.07em',
                  fontWeight:   600,
                  flexShrink:   0,
                }}
              >
                {label}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
