import { motion } from 'framer-motion';
import { useThemeColors } from '../context/AppContext';

interface CompassRoseProps {
  heading: number;
  style?: React.CSSProperties;
}

export function CompassRose({ heading, style }: CompassRoseProps) {
  const tc = useThemeColors();

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        right: 16,
        width: 52,
        height: 52,
        zIndex: 10,
        pointerEvents: 'none',
        ...style,
      }}
    >
      {/* Outer holographic ring */}
      <motion.div
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          border: '1px solid rgba(0,212,255,0.25)',
          boxShadow: '0 0 12px rgba(0,212,255,0.1)',
        }}
      />

      {/* Rotating compass body */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `rotate(${-heading}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <svg viewBox="0 0 52 52" width={52} height={52}>
          <defs>
            <filter id="compassGlow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Cardinal tick marks */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const isCardinal = angle % 90 === 0;
            const rad = (angle - 90) * (Math.PI / 180);
            const r1 = isCardinal ? 18 : 20;
            const r2 = 23;
            const x1 = 26 + Math.cos(rad) * r1;
            const y1 = 26 + Math.sin(rad) * r1;
            const x2 = 26 + Math.cos(rad) * r2;
            const y2 = 26 + Math.sin(rad) * r2;
            return (
              <line
                key={angle}
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={isCardinal ? tc.compassMajor : tc.compassMinor}
                strokeWidth={isCardinal ? 1.2 : 0.8}
              />
            );
          })}

          {/* North needle — cyan */}
          <polygon
            points="26,6 23,26 26,22 29,26"
            fill="#00D4FF"
            opacity={0.9}
            filter="url(#compassGlow)"
          />

          {/* South needle — dim */}
          <polygon
            points="26,46 23,26 26,30 29,26"
            fill={tc.southNeedle}
          />

          {/* Center dot */}
          <circle cx={26} cy={26} r={2} fill="#00D4FF" opacity={0.8} />
          <circle cx={26} cy={26} r={3.5} fill="none" stroke="rgba(0,212,255,0.3)" strokeWidth={0.8} />
        </svg>
      </motion.div>

      {/* Static N label */}
      <div
        style={{
          position: 'absolute',
          top: -14,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 8,
          fontFamily: 'JetBrains Mono, monospace',
          color: 'rgba(0,212,255,0.5)',
          letterSpacing: '0.1em',
          pointerEvents: 'none',
        }}
      >
        N
      </div>
    </div>
  );
}
