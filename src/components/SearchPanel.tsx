import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Navigation2, LocateFixed, X, Loader2, ArrowRight } from 'lucide-react';
import { useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import { AMMAN_ROUTES } from '../data/mockRoutes';
import type { AmmanRouteConfig, LatLng } from '../types';

interface NamedPoint { latlng: LatLng; name: string }

export interface SearchPanelProps {
  isLoaded:       boolean;
  onConfigReady:  (cfg: AmmanRouteConfig) => void;
  onLocationPick?: (latlng: LatLng) => void;
  onClear:        () => void;
  hasRoute:       boolean;
  loading:        boolean;
}

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

// ─── SearchPanel ── Premium Command Dock ──────────────────────────────────────
export const SearchPanel = memo(function SearchPanel({
  isLoaded,
  onConfigReady,
  onLocationPick,
  onClear,
  hasRoute,
  loading,
}: SearchPanelProps) {
  const tc = useThemeColors();
  const t  = useT();

  const [originVal,     setOriginVal]     = useState('');
  const [destVal,       setDestVal]       = useState('');
  const [locating,      setLocating]      = useState(false);
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused,   setDestFocused]   = useState(false);

  const originRef        = useRef<NamedPoint | null>(null);
  const destRef          = useRef<NamedPoint | null>(null);
  const originInputRef   = useRef<HTMLInputElement>(null);
  const destInputRef     = useRef<HTMLInputElement>(null);
  const originACRef      = useRef<google.maps.places.Autocomplete | null>(null);
  const destACRef        = useRef<google.maps.places.Autocomplete | null>(null);
  const onConfigReadyRef = useRef(onConfigReady);
  onConfigReadyRef.current = onConfigReady;

  const anyFocused = originFocused || destFocused;

  const tryEmit = useCallback((o: NamedPoint | null, d: NamedPoint | null) => {
    if (o && d) onConfigReadyRef.current(buildLiveConfig(o, d));
  }, []);

  // Flip PAC dropdown upward when near bottom
  useEffect(() => {
    const observer = new MutationObserver(() => {
      document.querySelectorAll<HTMLElement>('.pac-container').forEach((pac) => {
        const rect = pac.getBoundingClientRect();
        if (rect.bottom > window.innerHeight - 8) {
          const input = (originFocused ? originInputRef : destInputRef).current;
          if (input) {
            const iRect = input.getBoundingClientRect();
            pac.style.top    = `${iRect.top - rect.height - 6}px`;
            pac.style.bottom = 'auto';
          }
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    return () => observer.disconnect();
  }, [originFocused]);

  // Autocomplete init
  const initAC = useCallback(() => {
    if (!isLoaded || !window.google?.maps?.places?.Autocomplete) return;
    const opts: google.maps.places.AutocompleteOptions = {
      types: ['geocode', 'establishment'],
      componentRestrictions: { country: 'jo' },
      fields: ['geometry', 'name', 'formatted_address'],
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

  // Geolocation
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
        onLocationPick?.(named.latlng);
        tryEmit(named, destRef.current);
      },
      (err) => { console.warn('[EcoRoute] geolocation failed:', err.message); setLocating(false); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }, [locating, onLocationPick, t.search.myLocation, tryEmit]);

  // Quick route preset
  const handleQuickRoute = useCallback((r: AmmanRouteConfig) => {
    const wps       = (t.waypointLabels as Record<string, string[]>)[r.id] ?? r.waypointLabels;
    const originLbl = wps[0] ?? r.waypointLabels[0];
    const destLbl   = wps[wps.length - 1] ?? r.waypointLabels[r.waypointLabels.length - 1];
    originRef.current = { latlng: r.origin, name: originLbl };
    destRef.current   = { latlng: r.destination, name: destLbl };
    setOriginVal(originLbl);
    setDestVal(destLbl);
    onConfigReadyRef.current(r);
  }, [t.waypointLabels]);

  // Clear
  const handleClear = useCallback(() => {
    originRef.current = null;
    destRef.current   = null;
    setOriginVal('');
    setDestVal('');
    if (originInputRef.current) originInputRef.current.value = '';
    if (destInputRef.current)   destInputRef.current.value   = '';
    onClear();
  }, [onClear]);

  const inputStyle: React.CSSProperties = {
    flex: 1, background: 'none', border: 'none', outline: 'none',
    fontSize: 12, color: tc.textPrimary,
    fontFamily: 'Inter, -apple-system, sans-serif',
    letterSpacing: '-0.022em',
    minWidth: 0,
  };

  // Field styling: focused = inner-glow accent, else transparent
  const fieldStyle = (focused: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '9px 12px', borderRadius: 14,
    background: focused ? 'rgba(0,212,255,0.06)' : tc.fieldBg,
    border: focused
      ? '1px solid rgba(0,212,255,0.28)'
      : '1px solid transparent',
    boxShadow: focused ? 'inset 0 1px 0 rgba(0,212,255,0.14), inset 0 0 0 1px rgba(0,212,255,0.08)' : 'none',
    transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.36, type: 'spring', stiffness: 120, damping: 20 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 12, width: 'min(880px, calc(100vw - 32px))',
      }}
    >
      {/* Multi-layer glass dock — outer container */}
      <div
        className={`panel search-dock${anyFocused ? ' dock-active-pulse' : ''}`}
        style={{ borderRadius: 24, padding: '10px 14px' }}
      >
        {/* 1px inner glow highlight line */}
        <div style={{
          position: 'absolute', top: 0, left: 16, right: 16, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.18) 30%, rgba(255,255,255,0.12) 50%, rgba(0,212,255,0.18) 70%, transparent)',
          borderRadius: '0 0 1px 1px',
          opacity: anyFocused ? 1 : 0.5,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Origin field */}
          <div style={{ ...fieldStyle(originFocused), flex: 1 }}>
            <MapPin size={12} color={originFocused ? '#00D4FF' : tc.textSecondary} style={{ flexShrink: 0, transition: 'color 0.18s' }} />
            <input
              ref={originInputRef}
              type="text" className="eco-search-input"
              value={originVal}
              onChange={(e) => setOriginVal(e.target.value)}
              onFocus={() => setOriginFocused(true)}
              onBlur={() => setOriginFocused(false)}
              placeholder={t.search.originPlaceholder}
              autoComplete="off"
              style={inputStyle}
            />
            {/* GPS button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }}
              whileTap={{ scale: 0.88 }}
              onClick={handleMyLocation}
              title={t.search.myLocation}
              style={{
                flexShrink: 0, background: 'rgba(0,212,255,0.07)',
                border: '1px solid rgba(0,212,255,0.22)', borderRadius: 8,
                padding: '4px 8px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                transition: 'background 0.18s, border-color 0.18s',
                boxShadow: '0 0 8px rgba(0,212,255,0.08)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background   = 'rgba(0,212,255,0.14)';
                (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(0,212,255,0.40)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background   = 'rgba(0,212,255,0.07)';
                (e.currentTarget as HTMLElement).style.borderColor  = 'rgba(0,212,255,0.22)';
              }}
            >
              {locating ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}>
                  <Loader2 size={9} color="#00D4FF" />
                </motion.div>
              ) : (
                <LocateFixed size={9} color="#00D4FF" />
              )}
              <span style={{ fontSize: 8, color: '#00D4FF', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.10em', fontWeight: 700 }}>GPS</span>
            </motion.button>
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <div style={{ width: 1, height: 18, background: tc.divider }} />
            <motion.div
              animate={{ x: [0, 2, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ArrowRight size={12} color={tc.textDim} />
            </motion.div>
            <div style={{ width: 1, height: 18, background: tc.divider }} />
          </div>

          {/* Destination field */}
          <div style={{ ...fieldStyle(destFocused), flex: 1.35 }}>
            <Navigation2 size={12} color={destFocused ? '#00D4FF' : '#00D4FF'} style={{ flexShrink: 0 }} />
            <input
              ref={destInputRef}
              type="text" className="eco-search-input"
              value={destVal}
              onChange={(e) => setDestVal(e.target.value)}
              onFocus={() => setDestFocused(true)}
              onBlur={() => setDestFocused(false)}
              placeholder={t.search.destPlaceholder}
              autoComplete="off"
              style={inputStyle}
            />
            <AnimatePresence>
              {loading && (
                <motion.div key="spin" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} style={{ flexShrink: 0, display: 'flex' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}>
                    <Loader2 size={11} color="#00D4FF" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {hasRoute && !loading && (
                <motion.button
                  key="clear"
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.85 }}
                  onClick={handleClear}
                  title={t.search.clearRoute}
                  style={{
                    flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${tc.divider}`,
                    borderRadius: 8, padding: '4px 8px',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,100,100,0.10)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                >
                  <X size={9} color={tc.textDim} />
                  <span style={{ fontSize: 8, color: tc.textDim, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em' }}>
                    {t.search.clearRoute}
                  </span>
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Divider + quick pills */}
          <div style={{ width: 1, height: 22, background: tc.divider, flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {AMMAN_ROUTES.map((r) => {
              const label = ((t.routeNames as Record<string, string>)[r.id] ?? r.name).split(' — ')[0].split(' · ')[0];
              return (
                <motion.button
                  key={r.id}
                  whileHover={{ y: -1.5, scale: 1.03 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleQuickRoute(r)}
                  style={{
                    background: tc.tabActiveBg,
                    border: `1px solid ${tc.divider}`,
                    borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                    fontSize: 9, color: tc.textSecondary,
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.08em', fontWeight: 700,
                    transition: 'border-color 0.18s ease, background 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,255,0.30)';
                    (e.currentTarget as HTMLElement).style.background  = 'rgba(0,212,255,0.07)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = tc.divider;
                    (e.currentTarget as HTMLElement).style.background  = tc.tabActiveBg;
                  }}
                >
                  {label}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
