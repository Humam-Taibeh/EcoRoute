import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleMap, OverlayView } from '@react-google-maps/api';
import { MAP_STYLE, MAP_STYLE_LIGHT, DEFAULT_CENTER, DEFAULT_ZOOM } from '../data/mockRoutes';
import { CompassRose } from './CompassRose';
import { useAppTheme } from '../context/AppContext';
import { useT } from '../i18n';
import type { LatLng, AmmanRouteConfig } from '../types';

// ─── Map Options ───────────────────────────────────────────────────────────────
const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI:  true,
  styles:            MAP_STYLE,
  backgroundColor:   '#050505',
  gestureHandling:   'greedy',
  clickableIcons:    false,
  keyboardShortcuts: false,
  tilt:    0,
  heading: 0,
};

// ─── Camera Math ───────────────────────────────────────────────────────────────
function easeOutQuart(t: number)  { return 1 - Math.pow(1 - t, 4); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function lerpAngle(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff >  180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

function animateCameraTo(
  map:  google.maps.Map,
  from: { zoom: number; lat: number; lng: number; heading: number; tilt: number },
  to:   { zoom: number; lat: number; lng: number; heading: number; tilt: number },
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
    new window.google.maps.LatLng(to.lat, to.lng),
  );
}

// ─── Glow Polyline Overlay ─────────────────────────────────────────────────────
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
    private t   = 0;
    private isRemoved = false;

    constructor(initialPath: LatLng[]) {
      super();
      this._path  = initialPath;
      this.div    = document.createElement('div');
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
      this.t = (this.t + 0.003) % 1;
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
      const left = Math.round(sw.x), top = Math.round(ne.y);
      const w = Math.ceil(ne.x - sw.x) + 1, h = Math.ceil(sw.y - ne.y) + 1;

      this.div.style.left = `${left}px`;
      this.div.style.top  = `${top}px`;
      this.canvas.width   = w;
      this.canvas.height  = h;

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
        const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
        const len = Math.sqrt(dx * dx + dy * dy);
        segs.push({ len, cumLen: total });
        total += len;
      }
      if (total === 0) return;

      // Outer ambient glow
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = 'rgba(0,212,255,0.10)';
      ctx.lineWidth   = 18;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.stroke();
      ctx.restore();

      // Core neon line
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = 'rgba(0,212,255,0.80)';
      ctx.lineWidth   = 2.8;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.shadowColor = '#00D4FF';
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.restore();

      // Moving light pulse (comet)
      const pulseHead   = this.t * total;
      const pulseLength = total * 0.13;

      const getPoint = (dist: number) => {
        if (dist <= 0) return pts[0];
        if (dist >= total) return pts[pts.length - 1];
        let cum = 0;
        for (let i = 0; i < segs.length; i++) {
          if (cum + segs[i].len >= dist) {
            const f = (dist - cum) / segs[i].len;
            return { x: pts[i].x + f * (pts[i + 1].x - pts[i].x), y: pts[i].y + f * (pts[i + 1].y - pts[i].y) };
          }
          cum += segs[i].len;
        }
        return pts[pts.length - 1];
      };

      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      let cum2 = 0;
      for (let i = 0; i < segs.length; i++) {
        const segStart = cum2, segEnd = cum2 + segs[i].len;
        const tailStart = pulseHead - pulseLength, tailEnd = pulseHead;
        if (segEnd < tailStart || segStart > tailEnd) { cum2 += segs[i].len; continue; }
        const clampS = Math.max(tailStart, segStart), clampE = Math.min(tailEnd, segEnd);
        const fS = (clampS - segStart) / segs[i].len, fE = (clampE - segStart) / segs[i].len;
        const p1 = { x: pts[i].x + fS * (pts[i+1].x - pts[i].x), y: pts[i].y + fS * (pts[i+1].y - pts[i].y) };
        const p2 = { x: pts[i].x + fE * (pts[i+1].x - pts[i].x), y: pts[i].y + fE * (pts[i+1].y - pts[i].y) };
        const alpha = Math.pow((clampE - tailStart) / pulseLength, 1.4);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.92})`;
        ctx.lineWidth   = 3.8 * alpha + 1;
        ctx.shadowColor = '#00FFFF';
        ctx.shadowBlur  = 16 * alpha;
        ctx.stroke();
        cum2 += segs[i].len;
      }
      ctx.restore();

      const head = getPoint(pulseHead);
      ctx.save();
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
      ctx.fillStyle   = '#ffffff';
      ctx.beginPath(); ctx.arc(head.x, head.y, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur  = 32;
      ctx.fillStyle   = 'rgba(0,255,255,0.55)';
      ctx.beginPath(); ctx.arc(head.x, head.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    updatePath(newPath: LatLng[]) { this._path = newPath; this.t = 0; }

    onRemove() {
      this.isRemoved = true;
      cancelAnimationFrame(this.raf);
      this.div.parentNode?.removeChild(this.div);
    }
  }
  return new GlowRouteOverlay(path);
}

// ─── 3D Neon Cyan AeroMarker ───────────────────────────────────────────────────
// Tilts forward when moving, rotates by GPS heading.
interface AeroMarkerProps {
  position: LatLng;
  heading:  number;
  speed:    number; // m/s — used for tilt angle
}

const AeroMarker = memo(function AeroMarker({ position, heading, speed }: AeroMarkerProps) {
  // Lean forward proportional to speed (capped at 28°)
  const tiltDeg = Math.min(speed * 4.5, 28);

  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div style={{ transform: 'translate(-50%, -50%)', position: 'relative', width: 48, height: 48 }}>

        {/* Three expanding rings */}
        <div className="aero-ring" style={{ width: 44, height: 44 }} />
        <div className="aero-ring aero-ring-2" style={{ width: 44, height: 44 }} />
        <div className="aero-ring aero-ring-3" style={{ width: 44, height: 44 }} />

        {/* 3D marker body — rotates to heading, tilts by speed */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: `rotate(${heading}deg)`,
          transition: 'transform 0.3s ease-out',
        }}>
          <div style={{
            perspective: '120px',
            transform: `rotateX(${tiltDeg}deg)`,
            transition: 'transform 0.4s ease-out',
          }}>
            <svg
              width={40} height={46} viewBox="0 0 40 46"
              style={{ filter: 'drop-shadow(0 0 10px rgba(0,255,255,0.85)) drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
            >
              <defs>
                <radialGradient id="aeroFill" cx="50%" cy="30%" r="60%">
                  <stop offset="0%"   stopColor="#00FFFF" stopOpacity="0.30" />
                  <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.08" />
                </radialGradient>
                <radialGradient id="aeroCoreGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%"   stopColor="#00FFFF" />
                  <stop offset="100%" stopColor="#00B4DD" />
                </radialGradient>
              </defs>
              {/* Outer ring */}
              <circle cx={20} cy={26} r={16} fill="none"
                stroke="rgba(0,255,255,0.35)" strokeWidth="1" />
              {/* Body fill */}
              <circle cx={20} cy={26} r={15} fill="url(#aeroFill)" />
              {/* Heading arrow — points up (north = heading 0) */}
              <polygon
                points="20,3 25,18 20,15 15,18"
                fill="url(#aeroCoreGrad)"
                style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,255,0.9))' }}
              />
              {/* Core dot */}
              <circle cx={20} cy={26} r={5} fill="rgba(0,255,255,0.20)"
                stroke="#00FFFF" strokeWidth="1.4" />
              <circle cx={20} cy={26} r={2.5} fill="#00FFFF" />
            </svg>
          </div>
        </div>
      </div>
    </OverlayView>
  );
});

// ─── Ghost Marker (elevation chart hover sync) ─────────────────────────────────
const GhostMarker = memo(function GhostMarker({ position }: { position: LatLng }) {
  return (
    <OverlayView position={position} mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
      <div style={{ transform: 'translate(-50%, -50%)' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.18 }}
          style={{ position: 'relative', width: 24, height: 24 }}
        >
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.50)',
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(4px)',
          }} />
          <div style={{
            position: 'absolute', inset: '32%', borderRadius: '50%',
            background: 'rgba(255,255,255,0.80)',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
          }} />
          {/* Vertical dashed line to ground */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 1, height: 20,
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.5), transparent)',
          }} />
        </motion.div>
      </div>
    </OverlayView>
  );
});

// ─── Waypoint Dot ──────────────────────────────────────────────────────────────
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
              border: '1px solid rgba(0,212,255,0.22)',
              animation: 'pulseRing 2.8s ease-out infinite',
              pointerEvents: 'none',
            }} />
          )}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1.5px solid ${isEndpoint ? '#00D4FF' : 'rgba(255,255,255,0.38)'}`,
            background: isEndpoint ? 'rgba(0,212,255,0.14)' : 'rgba(255,255,255,0.07)',
            backdropFilter: 'blur(6px)',
          }} />
          <div style={{
            position: 'absolute', inset: '32%', borderRadius: '50%',
            background: isEndpoint ? '#00D4FF' : 'rgba(255,255,255,0.55)',
            boxShadow: isEndpoint ? '0 0 8px rgba(0,212,255,0.75)' : 'none',
          }} />
        </div>

        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              style={{
                position: 'absolute', top: 26, left: '50%',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 9, color: 'rgba(255,255,255,0.75)',
                letterSpacing: '0.10em',
                background: 'rgba(5,5,5,0.88)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 6, padding: '3px 8px',
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

// ─── Fallback Map ──────────────────────────────────────────────────────────────
function classifyError(loadError: Error | undefined, keyMissing: boolean, routeError: string | null) {
  if (keyMissing)                                    return { code: 'NO_KEY',        color: '#F59E0B' };
  if (loadError || routeError?.includes('NO_KEY'))   return { code: 'NO_KEY',        color: '#F59E0B' };
  if (routeError?.includes('REQUEST_DENIED'))        return { code: 'REQUEST_DENIED', color: '#EF4444' };
  if (routeError?.includes('ROUTES_API'))            return { code: 'ROUTES_API',     color: '#EF4444' };
  if (routeError?.includes('ELEVATION'))             return { code: 'ELEVATION_API',  color: '#F59E0B' };
  if (routeError)                                    return { code: 'NETWORK_ERROR',  color: '#EF4444' };
  return                                                    { code: 'LOADING',        color: '#00D4FF' };
}

const FIX_STEPS: Record<string, { title: string; steps: string[] }> = {
  NO_KEY:         { title: 'API key missing',  steps: ['Open .env.local in the project root', 'Add: VITE_GOOGLE_MAPS_API_KEY=<your-key>', 'Restart the dev server (npm run dev)'] },
  REQUEST_DENIED: { title: 'API not authorized', steps: ['Open Google Cloud Console → APIs & Services', 'Enable: Maps JavaScript API', 'Enable: Routes API  (replaces Directions API)', 'Enable: Elevation API', 'Ensure billing is active on the project'] },
  ROUTES_API:     { title: 'Routes API error', steps: ['Enable Routes API in Google Cloud Console', 'Verify the key has no HTTP-referrer restrictions blocking localhost', 'Check the browser console for the full error code'] },
  ELEVATION_API:  { title: 'Elevation API error', steps: ['Enable Elevation API in Google Cloud Console', 'Physics engine will use Amman terrain fallback data in the meantime'] },
  NETWORK_ERROR:  { title: 'Network error', steps: ['Check your internet connection', 'Routes API is only called once on load — refresh to retry'] },
  LOADING:        { title: 'Connecting…', steps: ['Authenticating with Google Maps Platform'] },
};

function FallbackMap({ routeName, loadError, keyMissing = false, routeError = null }: {
  routeName: string; loadError?: Error; keyMissing?: boolean; routeError?: string | null;
}) {
  const t = useT();
  const { theme } = useAppTheme();
  const { code, color } = classifyError(loadError, keyMissing, routeError);
  const { title, steps } = FIX_STEPS[code] ?? FIX_STEPS.LOADING;
  const isLoading = code === 'LOADING';

  return (
    <div className="map-grid" style={{
      width: '100%', height: '100%',
      background: theme === 'light' ? '#ECEDEF' : '#060608',
      position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="fg2"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        {['M 0 400 Q 300 380 600 400 Q 900 420 1200 400',
          'M 0 200 Q 400 180 600 200 Q 900 220 1200 200',
          'M 200 0 Q 180 400 200 800', 'M 600 0 Q 580 400 600 800', 'M 1000 0 Q 980 400 1000 800',
        ].map((d, i) => <path key={i} d={d} stroke="rgba(255,255,255,0.025)" strokeWidth={1.5} fill="none" />)}
        <motion.path d="M 180 680 Q 300 560 460 480 Q 580 420 700 370 Q 820 320 960 260 Q 1040 230 1020 180"
          stroke={`${color}22`} strokeWidth={14} fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }} />
        <motion.path d="M 180 680 Q 300 560 460 480 Q 580 420 700 370 Q 820 320 960 260 Q 1040 230 1020 180"
          stroke={`${color}55`} strokeWidth={1.5} fill="none" filter="url(#fg2)"
          strokeLinecap="round" strokeDasharray="8 6"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: [0.4, 0.75, 0.4] }}
          transition={{ pathLength: { duration: 2.5, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 3, repeat: Infinity } }} />
        <circle cx={180} cy={680} r={6} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
        <circle cx={180} cy={680} r={2.5} fill={color} opacity={0.6} />
        <circle cx={1020} cy={180} r={6} fill="none" stroke="#00E676" strokeWidth={1} opacity={0.4} />
        <circle cx={1020} cy={180} r={2.5} fill="#00E676" opacity={0.6} />
      </svg>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ position: 'relative', zIndex: 2, pointerEvents: 'none' }}>
        <div style={{
          backdropFilter: 'blur(28px)', borderRadius: 16, padding: '24px 28px', maxWidth: 380,
          background: theme === 'light' ? 'rgba(255,255,255,0.84)' : 'rgba(8,8,12,0.84)',
          border: `1px solid ${color}28`, display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                style={{ width: 7, height: 7, borderRadius: '50%', border: `1.5px solid ${color}`, borderTopColor: 'transparent' }} />
            ) : (
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, animation: 'breathe 2s ease-in-out infinite' }} />
            )}
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color }}>{t.offline.badge}</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.03em', color: 'rgba(255,255,255,0.88)', marginBottom: 3 }}>{routeName}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>{t.offline.fallback}</div>
          </div>
          <div style={{ height: 1, background: `${color}18` }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.08em', color, background: `${color}14`, border: `1px solid ${color}28`, borderRadius: 4, padding: '2px 7px' }}>{code}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.50)' }}>{title}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.30)', fontFamily: 'JetBrains Mono, monospace' }}>{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Route Scan ────────────────────────────────────────────────────────────────
function RouteScan({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 8, overflow: 'hidden' }}>
          <motion.div
            initial={{ top: '-2px' }} animate={{ top: '102%' }}
            transition={{ duration: 1.1, ease: [0.25, 0.1, 0.25, 1] }}
            style={{
              position: 'absolute', left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent 0%, rgba(0,212,255,0.5) 30%, rgba(255,255,255,0.8) 50%, rgba(0,212,255,0.5) 70%, transparent 100%)',
              boxShadow: '0 0 20px rgba(0,212,255,0.4), 0 0 40px rgba(0,212,255,0.15)',
            }}
          />
          <motion.div initial={{ opacity: 0.07 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }}
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,212,255,0.04) 0%, transparent 100%)' }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── MapContainer ──────────────────────────────────────────────────────────────
const GMAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface MapContainerProps {
  isLoaded:          boolean;
  loadError:         Error | undefined;
  activeRouteConfig: AmmanRouteConfig;
  activePath:        LatLng[];
  allPaths:          { id: string; path: LatLng[] }[];
  routeError?:       string | null;
  focusLocation?:    LatLng | null;
  onHeadingChange?:  (h: number) => void;
  /** Live GPS user position for AeroMarker */
  userPosition?:     LatLng | null;
  /** GPS heading in degrees */
  userHeading?:      number;
  /** Speed in m/s (for AeroMarker tilt) */
  userSpeed?:        number;
  /** Ghost marker position synced from elevation chart hover */
  ghostPosition?:    LatLng | null;
}

export const MapContainer = memo(function MapContainer({
  isLoaded,
  loadError,
  activeRouteConfig,
  activePath,
  allPaths: _allPaths,
  routeError     = null,
  focusLocation  = null,
  onHeadingChange,
  userPosition   = null,
  userHeading    = 0,
  userSpeed      = 0,
  ghostPosition  = null,
}: MapContainerProps) {
  const mapRef       = useRef<google.maps.Map | null>(null);
  const overlayRef   = useRef<IGlowRouteOverlay | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRef    = useRef<HTMLDivElement>(null);
  const mouseRafRef  = useRef<number | null>(null);
  const [scanning,        setScanning]        = useState(false);
  const [compassHeading,  setCompassHeading]  = useState(0);
  const prevRouteId   = useRef('');
  const isAnimating   = useRef(false);

  // AeroMarker trailing ghost — track last 8 positions
  const trailHistoryRef = useRef<LatLng[]>([]);
  const [posTrail, setPosTrail] = useState<LatLng[]>([]);

  // ── Cinematic Orbital Lock: satellite altitude → orbit sweep → route lock ──
  const runCinematic = useCallback(async (map: google.maps.Map, path: LatLng[]) => {
    if (isAnimating.current || path.length < 2) return;
    isAnimating.current = true;
    setScanning(true);

    const start   = path[0];
    const end     = path[path.length - 1];
    const mid     = { lat: (start.lat + end.lat) / 2, lng: (start.lng + end.lng) / 2 };
    const bearing = computeBearing(start, end);
    const currentZoom    = map.getZoom() ?? 13;
    const currentCenter  = map.getCenter()!;
    const currentHeading = map.getHeading() ?? 0;
    const currentTilt    = map.getTilt() ?? 0;

    // Phase 1: Pull back to satellite altitude — global God's-eye view
    await animateCameraTo(
      map,
      { zoom: currentZoom, lat: currentCenter.lat(), lng: currentCenter.lng(), heading: currentHeading, tilt: currentTilt },
      { zoom: 4,  lat: mid.lat, lng: mid.lng, heading: 0, tilt: 0 },
      650
    );

    await new Promise((r) => setTimeout(r, 180));

    // Phase 2: Orbital sweep — rotate 200° around target at altitude (satellite locks on)
    await animateCameraTo(
      map,
      { zoom: 4,   lat: mid.lat, lng: mid.lng, heading: 0,   tilt: 0  },
      { zoom: 5.5, lat: mid.lat, lng: mid.lng, heading: 200, tilt: 12 },
      920
    );

    // Phase 3: Cinematic dive — lock onto route bearing + tilt 45° like a targeting drone
    await animateCameraTo(
      map,
      { zoom: 5.5, lat: mid.lat, lng: mid.lng, heading: 200, tilt: 12 },
      { zoom: 14,  lat: mid.lat, lng: mid.lng, heading: bearing, tilt: 45 },
      1900
    );

    setScanning(false);
    isAnimating.current = false;
  }, []);

  const { theme } = useAppTheme();
  const themeRef  = useRef(theme);
  themeRef.current = theme;

  // Theme style update
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setOptions({
      styles:          theme === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE,
      backgroundColor: theme === 'light' ? '#ECEDEF'       : '#050505',
    });
  }, [theme]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setOptions({
      styles:          themeRef.current === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE,
      backgroundColor: themeRef.current === 'light' ? '#ECEDEF'       : '#050505',
    });
    map.addListener('heading_changed', () => {
      const h = map.getHeading() ?? 0;
      setCompassHeading(h);
      onHeadingChange?.(h);
    });
  }, [onHeadingChange]);

  // Route change → cinematic + overlay
  useEffect(() => {
    if (!mapRef.current || activePath.length < 2 || !isLoaded) return;
    const isNewRoute = activeRouteConfig.id !== prevRouteId.current;
    prevRouteId.current = activeRouteConfig.id;

    if (overlayRef.current) {
      overlayRef.current.updatePath(activePath);
    } else {
      overlayRef.current = createGlowOverlay(activePath);
      overlayRef.current.setMap(mapRef.current);
    }

    if (isNewRoute) {
      runCinematic(mapRef.current, activePath);
    } else {
      const bounds = new window.google.maps.LatLngBounds();
      activePath.forEach((p) => bounds.extend(new window.google.maps.LatLng(p.lat, p.lng)));
      mapRef.current.fitBounds(bounds, { top: 80, right: 260, bottom: 200, left: 300 });
    }
  }, [activePath, activeRouteConfig.id, isLoaded, runCinematic]);

  // Focus location animation
  useEffect(() => {
    if (!mapRef.current || !isLoaded || !focusLocation) return;
    const map    = mapRef.current;
    const center = map.getCenter();
    const zoom   = map.getZoom() ?? 13;
    const heading = map.getHeading() ?? 0;
    const tilt    = map.getTilt() ?? 0;
    if (!center) return;
    void animateCameraTo(
      map,
      { zoom, lat: center.lat(), lng: center.lng(), heading, tilt },
      { zoom: Math.max(zoom, 16.5), lat: focusLocation.lat, lng: focusLocation.lng, heading, tilt: Math.min(tilt, 35) },
      900,
    );
  }, [focusLocation, isLoaded]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
      if (overlayRef.current) { overlayRef.current.setMap(null); overlayRef.current = null; }
    };
  }, []);

  // AeroMarker trail — update when position changes meaningfully
  useEffect(() => {
    if (!userPosition) { trailHistoryRef.current = []; setPosTrail([]); return; }
    const prev = trailHistoryRef.current;
    const last = prev[0];
    // Only push if moved at least ~1m (0.00001° ≈ 1.1m)
    if (!last || Math.abs(last.lat - userPosition.lat) > 0.000009 || Math.abs(last.lng - userPosition.lng) > 0.000009) {
      trailHistoryRef.current = [userPosition, ...prev.slice(0, 7)];
      setPosTrail([...trailHistoryRef.current]);
    }
  }, [userPosition]);

  // Mouse crosshair
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || !cursorRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (mouseRafRef.current) cancelAnimationFrame(mouseRafRef.current);
    mouseRafRef.current = requestAnimationFrame(() => {
      if (!cursorRef.current) return;
      cursorRef.current.style.opacity   = '1';
      cursorRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });
  }, []);

  const keyMissing   = !GMAPS_KEY;
  const showFallback = keyMissing || !!loadError || !isLoaded;

  const waypoints = activeRouteConfig.waypointLabels.map((label, i) => {
    const coordIndex = i === 0 ? 0
      : i === activeRouteConfig.waypointLabels.length - 1 ? activePath.length - 1
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
      onMouseLeave={() => { if (cursorRef.current) cursorRef.current.style.opacity = '0'; }}
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

          {/* AeroMarker trailing ghost — fading positional history */}
          {posTrail.slice(1).map((pos, i) => (
            <OverlayView key={`trail-${i}`} position={pos} mapPaneName={OverlayView.OVERLAY_LAYER}>
              <div style={{
                transform: 'translate(-50%, -50%)',
                width:  Math.max(3, 9 - i * 1.0),
                height: Math.max(3, 9 - i * 1.0),
                borderRadius: '50%',
                background: `rgba(0, 212, 255, ${Math.max(0.04, 0.40 - i * 0.055)})`,
                boxShadow: `0 0 ${Math.max(2, 7 - i)}px rgba(0, 212, 255, ${Math.max(0.03, 0.30 - i * 0.04)})`,
                pointerEvents: 'none',
              }} />
            </OverlayView>
          ))}

          {/* 3D Neon Cyan AeroMarker — live GPS position */}
          {userPosition && (
            <AeroMarker
              position={userPosition}
              heading={userHeading}
              speed={userSpeed}
            />
          )}

          {/* Ghost Marker — elevation chart hover sync (OverlayView handled inside GhostMarker) */}
          {ghostPosition && <GhostMarker key="ghost" position={ghostPosition} />}
        </GoogleMap>
      )}

      {/* Signature scan animation */}
      <RouteScan active={scanning} />

      {/* Vignette */}
      <div className="map-vignette" />

      {/* Compass */}
      <CompassRose heading={compassHeading} />

      {/* Precision crosshair cursor */}
      <div
        ref={cursorRef}
        style={{
          position: 'absolute', left: 0, top: 0,
          transform: 'translate3d(0,0,0)', opacity: 0,
          pointerEvents: 'none', zIndex: 9,
          transition: 'opacity 0.16s ease',
        }}
      >
        <svg width={34} height={34} viewBox="0 0 34 34" style={{ transform: 'translate(-50%,-50%)' }}>
          <line x1={17} y1={0}  x2={17} y2={12} stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
          <line x1={17} y1={22} x2={17} y2={34} stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
          <line x1={0}  y1={17} x2={12} y2={17} stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
          <line x1={22} y1={17} x2={34} y2={17} stroke="rgba(255,255,255,0.20)" strokeWidth={1} />
          <circle cx={17} cy={17} r={2.5} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
        </svg>
      </div>
    </motion.div>
  );
});
