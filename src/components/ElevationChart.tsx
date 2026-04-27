import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import type { ElevationPoint, EcoMetrics } from '../types';

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function ElevTooltip({ active, payload }: TooltipProps<number, string>) {
  const tc = useThemeColors();
  const t  = useT();
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as ElevationPoint;
  const gradeColor = d.grade > 5 ? '#F59E0B' : d.grade < -5 ? '#00E676' : tc.textSecondary;

  return (
    <div
      className="panel-tooltip"
      style={{ borderRadius: 8, padding: '8px 12px', minWidth: 120 }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { label: t.chart.altitude, val: `${d.elevation}m`,                                 color: '#00D4FF' },
          { label: t.chart.distance, val: `${d.distance.toFixed(1)} km`,                      color: tc.textSecondary },
          { label: t.chart.grade,    val: `${d.grade > 0 ? '+' : ''}${d.grade}%`,             color: gradeColor },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: tc.tooltipLabel, letterSpacing: '0.05em' }}>{label}</span>
            <span className="font-data" style={{ fontSize: 11, color }}>{val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ElevationChart ───────────────────────────────────────────────────────────
interface ElevationChartProps {
  data: ElevationPoint[];
  metrics: EcoMetrics;
  activeIndex?: number;
  onIndexChange?: (i: number) => void;
}

export const ElevationChart = memo(function ElevationChart({ data, metrics, activeIndex = 0, onIndexChange }: ElevationChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const tc = useThemeColors();
  const t  = useT();

  const handleMove = useCallback(
    (s: { activeTooltipIndex?: number }) => {
      if (s.activeTooltipIndex !== undefined) {
        setHovered(s.activeTooltipIndex);
        onIndexChange?.(s.activeTooltipIndex);
      }
    },
    [onIndexChange]
  );

  const displayIdx = hovered ?? activeIndex;
  const current = data[displayIdx] ?? data[0];
  const maxE = Math.max(...data.map((d) => d.elevation));
  const minE = Math.min(...data.map((d) => d.elevation));

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 18 }}
      transition={{ delay: 0.22, type: 'spring', stiffness: 100, damping: 20 }}
      className="elevation-float"
    >
      <div
        className="panel"
        style={{
          borderRadius: 16,
          padding: '12px 18px 10px',
          backdropFilter: 'blur(24px)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="text-label" style={{ fontSize: 10 }}>{t.chart.title}</span>
            {current && (
              <span className="font-data text-accent" style={{ fontSize: 12, fontWeight: 500 }}>
                {current.elevation}m
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', opacity: 0.8 }} />
              <span className="font-data" style={{ fontSize: 10, color: '#F59E0B' }}>+{metrics.totalElevationGain}m</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00E676', opacity: 0.8 }} />
              <span className="font-data" style={{ fontSize: 10, color: '#00E676' }}>−{metrics.totalElevationLoss}m</span>
            </div>
            <div className="panel" style={{ borderRadius: 6, padding: '2px 8px' }}>
              <span className="font-data" style={{ fontSize: 10, color: '#00E676' }}>
                ⟳ {metrics.regenRecoveryKWh.toFixed(3)} kWh
              </span>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div style={{ height: 90 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
              onMouseMove={handleMove}
              onMouseLeave={() => setHovered(null)}
            >
              <defs>
                <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00D4FF" stopOpacity={0.18} />
                  <stop offset="80%" stopColor="#00D4FF" stopOpacity={0.02} />
                </linearGradient>
                <filter id="chartGlow">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <XAxis dataKey="distance" hide />
              <YAxis domain={[minE - 30, maxE + 30]} hide />
              <Area
                type="monotone"
                dataKey="elevation"
                stroke="#00D4FF"
                strokeWidth={1.5}
                fill="url(#elevFill)"
                dot={false}
                activeDot={{ r: 4, fill: '#00D4FF', stroke: tc.activeDotStroke, strokeWidth: 2 }}
                style={{ filter: 'drop-shadow(0 0 2px rgba(0,212,255,0.4))' }}
              />
              <Tooltip
                content={<ElevTooltip />}
                cursor={{ stroke: tc.chartCursor, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Progress track */}
        <div className="progress-track" style={{ marginTop: 8 }}>
          <motion.div
            className="progress-fill"
            animate={{ width: `${((displayIdx + 1) / data.length) * 100}%` }}
            transition={{ duration: 0.25 }}
          />
        </div>
      </div>
    </motion.div>
  );
});
