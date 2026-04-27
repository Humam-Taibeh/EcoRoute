import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import type { Route, EcoMetrics } from '../types';

const SPRING = { type: 'spring', stiffness: 120, damping: 20 } as const;

// ─── Liquid Stagger Variants — spring bounce:0.4 ─────────────────────────────
const LIST_VARIANTS = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.07, when: 'beforeChildren' },
  },
};
const ITEM_VARIANTS = {
  hidden:   { opacity: 0, y: 14, scale: 0.93 },
  visible:  {
    opacity: 1, y: 0, scale: 1,
    transition: { type: 'spring' as const, bounce: 0.42, duration: 0.55 },
  },
};

// ─── Count-Up Animation Hook ───────────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(target);
  const animRef = useRef<number | null>(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    const from = prevTarget.current;
    if (from === target) return;
    prevTarget.current = target;

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
      }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(tick);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [target, duration]);

  return display;
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({ data, color = 'rgba(255,255,255,0.5)' }: { data: number[]; color?: string }) {
  const max = Math.max(...data), min = Math.min(...data), r = max - min || 1;
  const W = 72, H = 20;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / r) * H}`).join(' ');
  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color}
        strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Eco Score Ring ────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const tc     = useThemeColors();
  const R      = 30, C = 2 * Math.PI * R;
  const color  = score >= 75 ? '#00E676' : score >= 50 ? '#00D4FF' : '#F59E0B';
  const animatedScore = useCountUp(score, 1200);

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
          style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <motion.span
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...SPRING, delay: 0.5 }}
          className="font-data"
          style={{ fontSize: 19, fontWeight: 700, color, lineHeight: 1 }}
        >
          {Math.round(animatedScore)}
        </motion.span>
        <span className="text-label" style={{ fontSize: 7, marginTop: 2, letterSpacing: '0.14em' }}>ECO</span>
      </div>
    </div>
  );
}

// ─── Route Card ────────────────────────────────────────────────────────────────
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
      {isActive && (
        <motion.div
          layoutId="active-bar"
          style={{
            position: 'absolute', left: 0, top: '20%', bottom: '20%',
            width: 2, borderRadius: 1,
            background: 'linear-gradient(180deg, #00D4FF, #00E676)',
            boxShadow: '0 0 8px rgba(0,212,255,0.6)',
          }}
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#00D4FF' : tc.textPrimary, marginBottom: 3, letterSpacing: '-0.02em' }}>
            {route.name}
          </div>
          <div style={{ fontSize: 11, color: tc.textDesc, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
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
            <div className="text-label" style={{ fontSize: 8, marginBottom: 3 }}>{label}</div>
            <div className="flex items-baseline gap-0.5">
              <span className="font-data" style={{ fontSize: 14, fontWeight: 600, color: tc.textPrimary }}>{value}</span>
              <span style={{ fontSize: 9, color: tc.textUnit }}>{unit}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
      >
        <span className="text-label" style={{ fontSize: 8 }}>{t.route.waypoints}</span>
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
                  <span style={{ fontSize: 10, color: tc.textDim, letterSpacing: '0.03em' }}>{wp.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Metric Card ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  sparkData?: number[];
  delay?: number;
  color?: string;
}

export const MetricCard = memo(function MetricCard({ label, value, subValue, sparkData, delay = 0, color }: MetricCardProps) {
  const tc = useThemeColors();
  const valueColor = color ?? tc.textPrimary;

  // Extract numeric part for count-up
  const numMatch = value.match(/^(-?[\d.]+)/);
  const numPart  = numMatch ? parseFloat(numMatch[1]) : null;
  const suffix   = numMatch ? value.slice(numMatch[0].length) : value;
  const animated = useCountUp(numPart ?? 0, 1000);
  const displayVal = numPart !== null
    ? `${animated.toFixed(value.includes('.') ? (value.split('.')[1]?.replace(/[^0-9]/g, '').length ?? 0) : 0)}${suffix}`
    : value;

  return (
    <motion.div
      variants={ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className="panel transition-panel tilt-card"
      style={{ borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}
      whileHover={{
        scale: 1.02, y: -2,
        boxShadow: `0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px ${valueColor === tc.textPrimary ? 'rgba(255,255,255,0.10)' : `${valueColor}28`}, 0 0 18px ${valueColor === tc.textPrimary ? 'rgba(255,255,255,0.04)' : `${valueColor}12`}`,
        transition: { type: 'spring', stiffness: 380, damping: 22 },
      }}
    >
      <div>
        <div className="text-label" style={{ fontSize: 8, marginBottom: 4 }}>{label}</div>
        <div className="font-data" style={{ fontSize: 15, fontWeight: 600, color: valueColor, letterSpacing: '-0.02em' }}>
          {displayVal}
        </div>
        {subValue && <div style={{ fontSize: 9, color: tc.textUnit, marginTop: 2, letterSpacing: '-0.01em' }}>{subValue}</div>}
      </div>
      {sparkData && <Sparkline data={sparkData} color={valueColor === tc.textPrimary ? tc.textMuted : valueColor} />}
    </motion.div>
  );
});

// ─── Eco Score Card ────────────────────────────────────────────────────────────
export const EcoScoreCard = memo(function EcoScoreCard({ metrics, delay = 0 }: { metrics: EcoMetrics; delay?: number }) {
  const t  = useT();
  const tc = useThemeColors();

  const animPenalty = useCountUp(metrics.energyPenaltyKWh, 900);
  const animRegen   = useCountUp(metrics.regenRecoveryKWh, 900);
  const animGain    = useCountUp(metrics.totalElevationGain, 900);

  const rows = [
    { label: t.eco.climbPenalty, val: animPenalty.toFixed(3), unit: 'kWh', color: '#F59E0B' },
    { label: t.eco.regenCapture, val: animRegen.toFixed(3),   unit: 'kWh', color: '#00E676' },
    { label: t.eco.elevGain,     val: Math.round(animGain).toString(), unit: 'm', color: tc.textSecondary },
  ];

  return (
    <motion.div
      variants={ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className="panel tilt-card"
      style={{ borderRadius: 14, padding: '16px' }}
      whileHover={{
        scale: 1.015, y: -2,
        boxShadow: '0 12px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,212,255,0.14), 0 0 18px rgba(0,212,255,0.07)',
        transition: { type: 'spring', stiffness: 380, damping: 22 },
      }}
    >
      <div className="text-label" style={{ marginBottom: 14, fontSize: 8 }}>{t.eco.impact}</div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <ScoreRing score={metrics.ecoScore} />

        {/* Staggered metrics list */}
        <motion.div
          variants={LIST_VARIANTS}
          initial="hidden"
          animate="visible"
          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {rows.map(({ label, val, unit, color }) => (
            <motion.div key={label} variants={ITEM_VARIANTS}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-label" style={{ fontSize: 8 }}>{label}</span>
              <span className="font-data" style={{ fontSize: 12, color }}>
                {val}<span style={{ fontSize: 9, color: tc.textUnit, marginLeft: 2 }}>{unit}</span>
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
});

// ─── Vehicle Card ──────────────────────────────────────────────────────────────
export const VehicleCard = memo(function VehicleCard({
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
      variants={ITEM_VARIANTS}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className="panel tilt-card"
      style={{ borderRadius: 12, padding: '14px 16px' }}
      whileHover={{
        scale: 1.015, y: -1,
        boxShadow: '0 10px 32px rgba(0,0,0,0.50), 0 0 0 1px rgba(255,255,255,0.08)',
        transition: { type: 'spring', stiffness: 380, damping: 22 },
      }}
    >
      <div className="text-label" style={{ fontSize: 8, marginBottom: 14 }}>{t.vehicle.params}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[
          { label: t.vehicle.mass,     display: `${mass} kg`,                           min: 800,  max: 3000, step: 50,   value: mass,            onChange: onMassChange,  color: undefined },
          { label: t.vehicle.regenEff, display: `${Math.round(regenEfficiency * 100)}%`, min: 0.1,  max: 0.6,  step: 0.01, value: regenEfficiency, onChange: onRegenChange, color: '#00E676' as const },
        ].map((p) => (
          <div key={p.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span className="text-label" style={{ fontSize: 9 }}>{p.label}</span>
              <span className="font-data" style={{ fontSize: 12, ...(p.color ? { color: p.color } : {}) }}>{p.display}</span>
            </div>
            <input type="range" min={p.min} max={p.max} step={p.step} value={p.value}
              onChange={(e) => p.onChange(Number(e.target.value))} className="w-full" />
          </div>
        ))}
      </div>
    </motion.div>
  );
});
