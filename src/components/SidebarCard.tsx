import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import type { Route, EcoMetrics } from '../types';

const SPRING = { type: 'spring', stiffness: 100, damping: 20 } as const;

// ─── Sparkline ────────────────────────────────────────────────────────────────
function Sparkline({ data, color = 'rgba(255,255,255,0.5)' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const r = max - min || 1;
  const W = 72, H = 20;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / r) * H}`).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Eco Score Ring ───────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const tc = useThemeColors();
  const R = 30, C = 2 * Math.PI * R;
  const color = score >= 75 ? '#00E676' : score >= 50 ? '#00D4FF' : '#F59E0B';

  return (
    <div style={{ position: 'relative', width: 76, height: 76, flexShrink: 0 }}>
      <svg width={76} height={76} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={38} cy={38} r={R} fill="none" stroke={tc.scoreRingBg} strokeWidth={3} />
        <motion.circle
          cx={38} cy={38} r={R}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - score / 100) }}
          transition={{ duration: 1.6, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING, delay: 0.6 }}
          className="font-data"
          style={{ fontSize: 18, fontWeight: 600, color, lineHeight: 1 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="text-label" style={{ fontSize: 8, marginTop: 2 }}>ECO</span>
      </div>
    </div>
  );
}

// ─── Route Card ───────────────────────────────────────────────────────────────
interface RouteCardProps {
  route: Route;
  isActive: boolean;
  onSelect: () => void;
  delay?: number;
}

export function RouteCard({ route, isActive, onSelect, delay = 0 }: RouteCardProps) {
  const [open, setOpen] = useState(false);
  const tc = useThemeColors();
  const t  = useT();
  const trafficDot = { low: '#00E676', medium: '#F59E0B', high: '#EF4444' }[route.trafficLevel];

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ...SPRING }}
      onClick={onSelect}
      className={`transition-panel cursor-pointer ${isActive ? 'panel-active' : 'panel'}`}
      style={{ borderRadius: 12, padding: '14px 16px', position: 'relative', overflow: 'hidden' }}
      whileHover={{ x: 2, transition: { duration: 0.15 } }}
    >
      {/* Active accent bar */}
      {isActive && (
        <motion.div
          layoutId="active-bar"
          style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 2, borderRadius: 1,
            background: 'linear-gradient(180deg, #00D4FF, #00E676)',
          }}
        />
      )}

      <div className="flex items-start justify-between gap-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#00D4FF' : tc.textPrimary, marginBottom: 3, letterSpacing: '-0.01em' }}>
            {route.name}
          </div>
          <div style={{ fontSize: 11, color: tc.textDesc, lineHeight: 1.4 }}>
            {route.description}
          </div>
        </div>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: trafficDot, flexShrink: 0, marginTop: 4 }} />
      </div>

      <div className="divider" style={{ margin: '10px 0' }} />

      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { label: t.route.dist, value: `${route.distance}`, unit: 'km' },
          { label: t.route.eta,  value: `${route.estimatedTime}`, unit: 'min' },
          { label: t.route.eco,  value: `${route.ecoRating}`, unit: '%' },
        ].map(({ label, value, unit }) => (
          <div key={label}>
            <div className="text-label" style={{ fontSize: 9, marginBottom: 3 }}>{label}</div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-data" style={{ fontSize: 14, fontWeight: 500, color: tc.textPrimary }}>{value}</span>
              <span style={{ fontSize: 9, color: tc.textUnit }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Waypoints toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span className="text-label" style={{ fontSize: 9 }}>{t.route.waypoints}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={10} color={tc.textMuted} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {route.waypoints.map((wp, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: i === 0 || i === route.waypoints.length - 1 ? '#00D4FF' : tc.textMuted, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: tc.textDim, letterSpacing: '0.04em' }}>{wp.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Metric Row ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down';
  sparkData?: number[];
  delay?: number;
  color?: string;
}

export function MetricCard({ label, value, subValue, sparkData, delay = 0, color }: MetricCardProps) {
  const tc = useThemeColors();
  const valueColor = color ?? tc.textPrimary;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ...SPRING }}
      className="panel transition-panel"
      style={{ borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      whileHover={{ x: 2, transition: { duration: 0.15 } }}
    >
      <div>
        <div className="text-label" style={{ marginBottom: 4 }}>{label}</div>
        <div className="font-data" style={{ fontSize: 15, fontWeight: 500, color: valueColor, letterSpacing: '-0.02em' }}>{value}</div>
        {subValue && <div style={{ fontSize: 10, color: tc.textUnit, marginTop: 2 }}>{subValue}</div>}
      </div>
      {sparkData && <Sparkline data={sparkData} color={valueColor === tc.textPrimary ? tc.textMuted : valueColor} />}
    </motion.div>
  );
}

// ─── Eco Score Card ───────────────────────────────────────────────────────────
export function EcoScoreCard({ metrics, delay = 0 }: { metrics: EcoMetrics; delay?: number }) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ...SPRING }}
      className="panel"
      style={{ borderRadius: 14, padding: '16px' }}
    >
      <div className="text-label" style={{ marginBottom: 14, fontSize: 9 }}>{t.eco.impact}</div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ScoreRing score={metrics.ecoScore} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: t.eco.climbPenalty, val: `${metrics.energyPenaltyKWh.toFixed(3)} kWh`, color: '#F59E0B' },
            { label: t.eco.regenCapture, val: `${metrics.regenRecoveryKWh.toFixed(3)} kWh`, color: '#00E676' },
            { label: t.eco.elevGain,     val: `${metrics.totalElevationGain}m`,             color: undefined },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-label" style={{ fontSize: 9 }}>{label}</span>
              <span className="font-data" style={{ fontSize: 12, ...(color ? { color } : {}) }}>{val}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Vehicle Card ─────────────────────────────────────────────────────────────
export function VehicleCard({
  mass, regenEfficiency, onMassChange, onRegenChange, delay = 0,
}: {
  mass: number;
  regenEfficiency: number;
  onMassChange: (v: number) => void;
  onRegenChange: (v: number) => void;
  delay?: number;
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, ...SPRING }}
      className="panel"
      style={{ borderRadius: 12, padding: '14px 16px' }}
    >
      <div className="text-label" style={{ marginBottom: 14, fontSize: 9 }}>{t.vehicle.params}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { label: t.vehicle.mass,     display: `${mass} kg`,                              min: 800,  max: 3000, step: 50,   value: mass,             onChange: onMassChange,    color: undefined },
          { label: t.vehicle.regenEff, display: `${Math.round(regenEfficiency * 100)}%`,   min: 0.1,  max: 0.6,  step: 0.01, value: regenEfficiency,  onChange: onRegenChange,   color: '#00E676' as const },
        ].map((p) => (
          <div key={p.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span className="text-label" style={{ fontSize: 10 }}>{p.label}</span>
              <span className="font-data" style={{ fontSize: 12, ...(p.color ? { color: p.color } : {}) }}>{p.display}</span>
            </div>
            <input type="range" min={p.min} max={p.max} step={p.step} value={p.value}
              onChange={(e) => p.onChange(Number(e.target.value))} className="w-full" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
