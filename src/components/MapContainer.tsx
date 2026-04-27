import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, OverlayView } from '@react-google-maps/api';
import { MAP_STYLE, MAP_STYLE_LIGHT, DEFAULT_CENTER, DEFAULT_ZOOM } from '../data/mockRoutes';
import { CompassRose } from './CompassRose';
import { useAppTheme } from '../context/AppContext';
import { useT } from '../i18n';
import type { LatLng, AmmanRouteConfig } from '../types';

// ─── Map Options ──────────────────────────────────────────────────────────────
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: true,
  styles: MAP_STYLE,
  backgroundColor: '#050505',
  gestureHandling: 'greedy',
  clickableIcons: false,
  keyboardShortcuts: false,
  tilt: 0,
  heading: 0,
};

// ─── Camera Animation ─────────────────────────────────────────────────────────
function easeOutQuart(t: number) { return 1 - Math.pow(1 - t, 4); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

function animateCameraTo(
  map: google.maps.Map,
  from: { zoom: number; lat: number; lng: number; heading: number; tilt: number },
  to: { zoom: number; lat: number; lng: number; heading: number; tilt: number },
  duration: number
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const t = easeOutQuart(progress);
      map.setZoom(lerp(from.zoom, to.zoom, t));
      map.setCenter({ lat: lerp(from.lat, to.lat, t), lng: lerp(from.lng, to.lng, t) });
      map.setHeading(lerpAngle(from.heading, to.heading, t));
      map.setTilt(lerp(from.tilt, to.tilt, t));
      if (progress < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function computeBearing(from: LatLng, to: LatLng): number {
  if (!window.google?.maps?.geometry) return 0;
  return window.google.maps.geometry.spherical.computeHeading(
    new window.google.maps.LatLng(from.lat, from.lng),
    new window.google.maps.LatLng(to.lat, to.lng)
  );
}

// ─── Glow Polyline (Canvas OverlayView) ───────────────────────────────────────
// The class MUST NOT extend window.google.maps.OverlayView at module scope —
// window.google is undefined until the Maps JS API async-loads. We use a factory
// that constructs the class on first call (always after isLoaded === true).

interface IGlowRouteOverlay {
  setMap(map: google.maps.Map | null): void;
  updatePath(path: LatLng[]): void;
}

function createGlowOverlay(path: LatLng[]): IGlowRouteOverlay {
  class GlowRouteOverlay extends window.google.maps.OverlayView {
    private div: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private _path: LatLng[];
    private raf = 0;
    private t = 0;
    private isRemoved = false;

    constructor(initialPath: LatLng[]) {
      super();
      this._path = initialPath;
      this.div = document.createElement('div');
      this.div.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;top:0;left:0;';
      this.div.appendChild(this.canvas);
    }

    onAdd() {
      const panes = this.getPanes();
      if (panes) panes.overlayLayer.appendChild(this.div);
      this.isRemoved = false;
      this.loop();
    }

    loop() {
      if (this.isRemoved) return;
      this.t = (this.t + 0.0035) % 1;
      this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }

    draw() {
      const proj = this.getProjection();
      if (!proj || !this.canvas.parentNode) return;

      const map = this.getMap() as google.maps.Map | null;
      if (!map) return;
      const bounds = map.getBounds();
      if (!bounds) return;

      const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest())!;
      const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast())!;

      const left = Math.round(sw.x);
      const top = Math.round(ne.y);
      const w = Math.ceil(ne.x - sw.x) + 1;
      const h = Math.ceil(sw.y - ne.y) + 1;

      this.div.style.left = `${left}px`;
      this.div.style.top = `${top}px`;
      this.canvas.width = w;
      this.canvas.height = h;

      const ctx = this.canvas.getContext('2d')!;
      ctx.clearRect(0, 0, w, h);

      const pts = this._path.map((ll) => {
        const p = proj.fromLatLngToDivPixel(new window.google.maps.LatLng(ll.lat, ll.lng))!;
        return { x: p.x - left, y: p.y - top };
      });
      if (pts.length < 2) return;

      const segs: { len: number; cumLen: number }[] = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        segs.push({ len, cumLen: total });
        total += len;
      }
      if (total === 0) return;

      // ── Base glow layer ──────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = 'rgba(0,212,255,0.12)';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
      ctx.restore();

      // ── Base line ────────────────────────────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = 'rgba(0,212,255,0.75)';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(0,212,255,0.5)';
      ctx.shadowBlur = 6;
      ctx.stroke();
      ctx.restore();

      // ── Moving pulse (comet) ─────────────────────────────────────────────
      const pulseHead = this.t * total;
      const pulseLength = total * 0.14;

      const getPoint = (dist: number) => {
        if (dist <= 0) return pts[0];
        if (dist >= total) return pts[pts.length - 1];
        let cum = 0;
        for (let i = 0; i < segs.length; i++) {
          if (cum + segs[i].len >= dist) {
            const f = (dist - cum) / segs[i].len;
            return {
              x: pts[i].x + f * (pts[i + 1].x - pts[i].x),
              y: pts[i].y + f * (pts[i + 1].y - pts[i].y),
            };
          }
          cum += segs[i].len;
        }
        return pts[pts.length - 1];
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let cum2 = 0;
      for (let i = 0; i < segs.length; i++) {
        const segStart = cum2;
        const segEnd = cum2 + segs[i].len;
        const tailStart = pulseHead - pulseLength;
        const tailEnd = pulseHead;

        if (segEnd < tailStart || segStart > tailEnd) { cum2 += segs[i].len; continue; }

        const clampS = Math.max(tailStart, segStart);
        const clampE = Math.min(tailEnd, segEnd);
        const fS = (clampS - segStart) / segs[i].len;
        const fE = (clampE - segStart) / segs[i].len;
        const p1 = {
          x: pts[i].x + fS * (pts[i + 1].x - pts[i].x),
          y: pts[i].y + fS * (pts[i + 1].y - pts[i].y),
        };
        const p2 = {
          x: pts[i].x + fE * (pts[i + 1].x - pts[i].x),
          y: pts[i].y + fE * (pts[i + 1].y - pts[i].y),
        };
        const alpha = Math.pow((clampE - tailStart) / pulseLength, 1.5);

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.9})`;
        ctx.lineWidth = 3.5 * alpha + 1;
        ctx.shadowColor = '#00D4FF';
        ctx.shadowBlur = 14 * alpha;
        ctx.stroke();

        cum2 += segs[i].len;
      }
      ctx.restore();

      const head = getPoint(pulseHead);
      ctx.save();
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 30;
      ctx.fillStyle = 'rgba(0,212,255,0.5)';
      ctx.beginPath();
      ctx.arc(head.x, head.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    updatePath(newPath: LatLng[]) {
      this._path = newPath;
      this.t = 0;
    }

    onRemove() {
      this.isRemoved = true;
      cancelAnimationFrame(this.raf);
      this.div.parentNode?.removeChild(this.div);
    }
  }

  return new GlowRouteOverlay(path);
}

// ─── Waypoint Dot ─────────────────────────────────────────────────────────────
function WaypointDot({ position, isEndpoint, label }: {
  position: google.maps.LatLngLiteral;
  isEndpoint: boolean;
  label: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div
        style={{ transform: 'translate(-50%,-50%)', cursor: 'default' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ position: 'relative', width: 22, height: 22 }}>
          {isEndpoint && (
            <div style={{
              position: 'absolute', inset: -8, borderRadius: '50%',
              border: '1px solid rgba(0,212,255,0.2)',
              animation: 'pulseRing 2.8s ease-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${isEndpoint ? '#00D4FF' : 'rgba(255,255,255,0.35)'}`,
            background: isEndpoint ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(6px)',
          }} />
          <div style={{
            position: 'absolute', inset: '32%', borderRadius: '50%',
            background: isEndpoint ? '#00D4FF' : 'rgba(255,255,255,0.5)',
            boxShadow: isEndpoint ? '0 0 8px rgba(0,212,255,0.7)' : 'none',
          }} />
        </div>

        {/* Label tooltip on hover */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: 26,
                left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9,
                color: 'rgba(255,255,255,0.7)',
                letterSpacing: '0.1em',
                background: 'rgba(5,5,5,0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 5,
                padding: '3px 7px',
                pointerEvents: 'none',
              }}
            >
              {label}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </OverlayView>
  );
}

// ─── Tactical Offline Mode ────────────────────────────────────────────────────
function classifyError(loadError: Error | undefined, keyMissing: boolean, routeError: string | null) {
  if (keyMissing)                                   return { code: 'NO_KEY',        color: '#F59E0B' };
  if (loadError || (routeError?.includes('NO_KEY'))) return { code: 'NO_KEY',        color: '#F59E0B' };
  if (routeError?.includes('REQUEST_DENIED'))        return { code: 'REQUEST_DENIED', color: '#EF4444' };
  if (routeError?.includes('ROUTES_API'))            return { code: 'ROUTES_API',     color: '#EF4444' };
  if (routeError?.includes('ELEVATION'))             return { code: 'ELEVATION_API',  color: '#F59E0B' };
  if (routeError)                                   return { code: 'NETWORK_ERROR',  color: '#EF4444' };
  return                                                   { code: 'LOADING',        color: '#00D4FF' };
}

const FIX_STEPS: Record<string, { title: string; steps: string[] }> = {
  NO_KEY: {
    title: 'API key missing',
    steps: [
      'Open .env.local in the project root',
      'Add: VITE_GOOGLE_MAPS_API_KEY=<your-key>',
      'Restart the dev server (npm run dev)',
    ],
  },
  REQUEST_DENIED: {
    title: 'API not authorized',
    steps: [
      'Open Google Cloud Console → APIs & Services',
      'Enable: Maps JavaScript API',
      'Enable: Routes API  (replaces Directions API)',
      'Enable: Elevation API',
      'Ensure billing is active on the project',
    ],
  },
  ROUTES_API: {
    title: 'Routes API error',
    steps: [
      'Enable Routes API in Google Cloud Console',
      'Verify the key has no HTTP-referrer restrictions blocking localhost',
      'Check the browser console for the full error code',
    ],
  },
  ELEVATION_API: {
    title: 'Elevation API error',
    steps: [
      'Enable Elevation API in Google Cloud Console',
      'Physics engine will use Amman terrain fallback data in the meantime',
    ],
  },
  NETWORK_ERROR: {
    title: 'Network error',
    steps: [
      'Check your internet connection',
      'Routes API is only called once on load — refresh to retry',
    ],
  },
  LOADING: {
    title: 'Connecting…',
    steps: ['Authenticating with Google Maps Platform'],
  },
};

interface FallbackMapProps {
  routeName: string;
  loadError?: Error;
  keyMissing?: boolean;
  routeError?: string | null;
}

function FallbackMap({ routeName, loadError, keyMissing = false, routeError = null }: FallbackMapProps) {
  const t = useT();
  const { theme } = useAppTheme();
  const { code, color } = classifyError(loadError, keyMissing, routeError);
  const { title, steps } = FIX_STEPS[code] ?? FIX_STEPS.LOADING;
  const fallbackBg = theme === 'light' ? '#F0F0F2' : '#070707';
  const isLoading = code === 'LOADING';

  return (
    <div
      className="map-grid"
      style={{
        width: '100%', height: '100%', background: fallbackBg,
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ghost route SVG */}
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="fg2">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {['M 0 400 Q 300 380 600 400 Q 900 420 1200 400',
          'M 0 200 Q 400 180 600 200 Q 900 220 1200 200',
          'M 200 0 Q 180 400 200 800',
          'M 600 0 Q 580 400 600 800',
          'M 1000 0 Q 980 400 1000 800',
        ].map((d, i) => (
          <path key={i} d={d} stroke="rgba(255,255,255,0.03)" strokeWidth={1.5} fill="none" />
        ))}

        {/* Pulsing ghost route */}
        <motion.path
          d="M 180 680 Q 300 560 460 480 Q 580 420 700 370 Q 820 320 960 260 Q 1040 230 1020 180"
          stroke={`${color}22`}
          strokeWidth={14}
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }}
        />
        <motion.path
          d="M 180 680 Q 300 560 460 480 Q 580 420 700 370 Q 820 320 960 260 Q 1040 230 1020 180"
          stroke={`${color}55`}
          strokeWidth={1.5}
          fill="none"
          filter="url(#fg2)"
          strokeLinecap="round"
          strokeDasharray="8 6"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: [0.4, 0.7, 0.4] }}
          transition={{ pathLength: { duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 3, repeat: Infinity } }}
        />

        {/* Origin */}
        <circle cx={180} cy={680} r={6} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
        <circle cx={180} cy={680} r={2.5} fill={color} opacity={0.6} />
        {/* Destination */}
        <circle cx={1020} cy={180} r={6} fill="none" stroke="#00E676" strokeWidth={1} opacity={0.4} />
        <circle cx={1020} cy={180} r={2.5} fill="#00E676" opacity={0.6} />
      </svg>

      {/* Tactical panel */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}
      >
        <div
          style={{
            backdropFilter: 'blur(24px)',
            background: theme === 'light' ? 'rgba(255,255,255,0.82)' : 'rgba(10,10,10,0.82)',
            border: `1px solid ${color}28`,
            borderRadius: 16,
            padding: '24px 28px',
            maxWidth: 380,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  border: `1.5px solid ${color}`,
                  borderTopColor: 'transparent',
                }}
              />
            ) : (
              <div style={{
                width: 7, height: 7, borderRadius: '50%',
                background: color,
                animation: 'breathe 2s ease-in-out infinite',
              }} />
            )}
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: color,
            }}>
              {t.offline.badge}
            </span>
          </div>

          {/* Route label */}
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.85)', marginBottom: 3 }}>
              {routeName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
              {t.offline.fallback}
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: `${color}18` }} />

          {/* Error code + title */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em',
                color: color, background: `${color}14`,
                border: `1px solid ${color}28`,
                borderRadius: 4, padding: '2px 7px',
              }}>
                {code}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{title}</span>
            </div>

            {/* Fix steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          {routeError && (
            <div style={{
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(255,255,255,0.15)', letterSpacing: '0.04em',
              borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12,
              wordBreak: 'break-all',
            }}>
              {routeError.slice(0, 120)}{routeError.length > 120 ? '…' : ''}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Signature Animation: Route Materialization Scan ─────────────────────────
function RouteScan({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8, overflow: 'hidden' }}
        >
          {/* Horizontal sweep line */}
          <motion.div
            initial={{ top: '-2px' }}
            animate={{ top: '102%' }}
            transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: 'absolute',
              left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.5) 30%, rgba(255,255,255,0.8) 50%, rgba(0,212,255,0.5) 70%, transparent 100%)',
              boxShadow: '0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.15)',
            }}
          />
          {/* Subtle flash */}
          <motion.div
            initial={{ opacity: 0.08 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(180deg, rgba(0,212,255,0.04) 0%, transparent 100%)',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── MapContainer ─────────────────────────────────────────────────────────────
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface MapContainerProps {
  isLoaded: boolean;
  loadError: Error | undefined;
  activeRouteConfig: AmmanRouteConfig;
  activePath: LatLng[];
  allPaths: { id: string; path: LatLng[] }[];
  routeError?: string | null;
  focusLocation?: LatLng | null;
  onHeadingChange?: (h: number) => void;
}

export const MapContainer = memo(function MapContainer({
  isLoaded,
  loadError,
  activeRouteConfig,
  activePath,
  allPaths,
  routeError = null,
  focusLocation = null,
  onHeadingChange,
}: MapContainerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlayRef = useRef<IGlowRouteOverlay | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const mouseRafRef = useRef<number | null>(null);
  const [scanning, setScanning] = useState(false);
  const [compassHeading, setCompassHeading] = useState(0);
  const prevRouteId = useRef('');
  const isAnimating = useRef(false);

  // ── Cinematic drone camera ───────────────────────────────────────────────
  const runCinematic = useCallback(async (map: google.maps.Map, path: LatLng[]) => {
    if (isAnimating.current || path.length < 2) return;
    isAnimating.current = true;
    setScanning(true);

    const start = path[0];
    const end = path[path.length - 1];
    const mid = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
    const bearing = computeBearing(start, end);
    const currentZoom = map.getZoom() ?? 13;
    const currentCenter = map.getCenter()!;
    const currentHeading = map.getHeading() ?? 0;
    const currentTilt = map.getTilt() ?? 0;

    // Phase 1: pull back to city context
    await animateCameraTo(
      map,
      { zoom: currentZoom, lat: currentCenter.lat(), lng: currentCenter.lng(), heading: currentHeading, tilt: currentTilt },
      { zoom: 11, lat: mid.lat, lng: mid.lng, heading: 0, tilt: 0 },
      500
    );

    // Small pause
    await new Promise((r) => setTimeout(r, 200));

    // Phase 2: drone dive in with bearing rotation + tilt
    await animateCameraTo(
      map,
      { zoom: 11, lat: mid.lat, lng: mid.lng, heading: 0, tilt: 0 },
      { zoom: 14, lat: mid.lat, lng: mid.lng, heading: bearing, tilt: 45 },
      1800
    );

    setScanning(false);
    isAnimating.current = false;
  }, []);

  const { theme } = useAppTheme();
  // Keep a ref so onMapLoad always reads the latest theme without being in deps
  const themeRef = useRef(theme);
  themeRef.current = theme;

  // ── React to theme changes: update map style in-place (no remount) ────────
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({
      styles:          theme === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE,
      backgroundColor: theme === 'light' ? '#ECEDEF'       : '#050505',
    });
  }, [theme]);

  // ── Map load callback ─────────────────────────────────────────────────────
  // Note: themeRef (not theme) is used here so this callback is stable and
  // never causes GoogleMap to rebuild when theme changes.
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Apply current theme style immediately (read via ref — no stale closure)
    map.setOptions({
      styles:          themeRef.current === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE,
      backgroundColor: themeRef.current === 'light' ? '#ECEDEF'       : '#050505',
    });

    // Listen for heading changes → update compass
    map.addListener('heading_changed', () => {
      const h = map.getHeading() ?? 0;
      setCompassHeading(h);
      onHeadingChange?.(h);
    });
  }, [onHeadingChange]); // theme intentionally omitted — themeRef handles it

  // ── Route change → cinematic + overlay update ────────────────────────────
  useEffect(() => {
    if (!mapRef.current || activePath.length < 2 || !isLoaded) return;

    const isNewRoute = activeRouteConfig.id !== prevRouteId.current;
    prevRouteId.current = activeRouteConfig.id;

    // Update or create glow overlay (factory defers class creation until google is ready)
    if (overlayRef.current) {
      overlayRef.current.updatePath(activePath);
    } else {
      overlayRef.current = createGlowOverlay(activePath);
      overlayRef.current.setMap(mapRef.current);
    }

    if (isNewRoute) {
      runCinematic(mapRef.current, activePath);
    } else {
      // Just fit bounds smoothly
      const bounds = new window.google.maps.LatLngBounds();
      activePath.forEach((p) => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
      mapRef.current.fitBounds(bounds, { top: 80, right: 260, bottom: 200, left: 300 });
    }
  }, [activePath, activeRouteConfig.id, isLoaded, runCinematic]);

  // ── Precision geolocation focus ───────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !focusLocation) return;
    const map = mapRef.current;
    const center = map.getCenter();
    const zoom = map.getZoom() ?? 13;
    const heading = map.getHeading() ?? 0;
    const tilt = map.getTilt() ?? 0;
    if (!center) return;

    void animateCameraTo(
      map,
      { zoom, lat: center.lat(), lng: center.lng(), heading, tilt },
      {
        zoom: Math.max(zoom, 16.5),
        lat: focusLocation.lat,
        lng: focusLocation.lng,
        heading,
        tilt: Math.min(tilt, 35),
      },
      900,
    );
  }, [focusLocation, isLoaded]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
    };
  }, []);

  // ── Mouse crosshair ───────────────────────────────────────────────────────
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cursorRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
    mouseRafRef.current = requestAnimationFrame(() => {
      if (!cursorRef.current) return;
      cursorRef.current.style.opacity = '1';
      cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }, []);

  const keyMissing = !GMAPS_KEY;
  const showFallback = keyMissing || !!loadError || !isLoaded;

  const waypoints = activeRouteConfig.waypointLabels.map((label, i) => {
    const coordIndex = i === 0 ? 0
      : i === activeRouteConfig.waypointLabels.length - 1
        ? activePath.length - 1
        : Math.floor((i / (activeRouteConfig.waypointLabels.length - 1)) * (activePath.length - 1));
    return { label, position: activePath[coordIndex] ?? activePath[0] };
  });

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="map-fullscreen"
      style={{ cursor: 'crosshair' }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => {
        if (cursorRef.current) cursorRef.current.style.opacity = '0';
      }}
    >
      {showFallback ? (
        <FallbackMap
          routeName={activeRouteConfig.name}
          loadError={loadError}
          keyMissing={keyMissing}
          routeError={routeError}
        />
      ) : (
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          options={MAP_OPTIONS}
          onLoad={onMapLoad}
        >
          {/* Inactive routes — dim base lines only */}
          {allPaths
            .filter((r) => r.id !== activeRouteConfig.id && r.path.length >= 2)
            .map((r) => (
              <OverlayView
                key={r.id}
                position={r.path[0]}
                mapPaneName={OverlayView.OVERLAY_LAYER}
              >
                <div style={{ display: 'none' }} />
              </OverlayView>
            ))}

          {/* Active route waypoints */}
          {activePath.length >= 2 &&
            waypoints.map((wp, i) =>
              wp.position ? (
                <WaypointDot
                  key={i}
                  position={wp.position}
                  isEndpoint={i === 0 || i === waypoints.length - 1}
                  label={wp.label}
                />
              ) : null
            )}
        </GoogleMap>
      )}

      {/* Signature scan animation */}
      <RouteScan active={scanning} />

      {/* Vignette */}
      <div className="map-vignette" />

      {/* Holographic Compass */}
      <CompassRose heading={compassHeading} />

      {/* Precision crosshair */}
      <div
        ref={cursorRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate3d(0, 0, 0)',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 9,
          transition: 'opacity 0.16s ease',
        }}
      >
        <svg width={34} height={34} viewBox="0 0 34 34" style={{ transform: 'translate(-50%, -50%)' }}>
          <line x1={17} y1={0} x2={17} y2={13} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <line x1={17} y1={21} x2={17} y2={34} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <line x1={0} y1={17} x2={13} y2={17} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <line x1={21} y1={17} x2={34} y2={17} stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
          <circle cx={17} cy={17} r={2.5} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        </svg>
      </div>
    </motion.div>
  );
});
