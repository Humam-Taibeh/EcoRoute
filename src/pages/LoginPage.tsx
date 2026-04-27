import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Globe } from 'lucide-react';
import { useAppLanguage, useAppTheme } from '../context/AppContext';

interface Props {
  onEnter: (name: string) => void;
}

const COPY = {
  en: {
    badge:      'AMMAN · NAVIGATION HUB',
    title:      'EcoRoute',
    tagline:    'Terrain-aware EV routing powered by real mgh physics and Gemini AI.',
    nameLabel:  'COMMANDER NAME',
    namePh:     'Enter your name',
    langHint:   'SELECT LANGUAGE',
    cta:        'INITIALIZE SYSTEM',
    note:       'v2.0 · AI Navigation · Google Maps + Gemini Flash',
    calibTitle: 'SYSTEM CALIBRATION',
    pinLabel:   'SIGNAL LOCKED',
    steps: [
      'GOOGLE MAPS · ROUTES API',
      'ELEVATION ENGINE · AMMAN TERRAIN',
      'GEMINI 2.0 · AI LAYER',
    ],
  },
  ar: {
    badge:      'عمّان · مركز الملاحة',
    title:      'EcoRoute',
    tagline:    'توجيه ذكي للسيارات الكهربائية مع فيزياء mgh الحقيقية وذكاء Gemini.',
    nameLabel:  'اسم القائد',
    namePh:     'أدخل اسمك',
    langHint:   'اختر اللغة',
    cta:        'تهيئة النظام',
    note:       'v2.0 · ملاحة بالذكاء الاصطناعي · Google Maps + Gemini Flash',
    calibTitle: 'معايرة النظام',
    pinLabel:   'تم قفل الإشارة',
    steps: [
      'Google Maps · واجهة المسارات',
      'محرك الارتفاع · تضاريس عمّان',
      'Gemini 2.0 · الطبقة الذكية',
    ],
  },
};

const CONTAINER = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.50, ease: [0.16, 1, 0.3, 1] as number[] } },
};

// ─── Phase 1: Navigation Pin Drop ─────────────────────────────────────────────
function PinDropPhase({ onLanded }: { onLanded: () => void }) {
  const [showRipple, setShowRipple] = useState(false);

  return (
    <motion.div
      initial={{ y: -280, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.15 }}
      onAnimationComplete={() => {
        setShowRipple(true);
        setTimeout(onLanded, 900);
      }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}
    >
      {/* The Pin */}
      <motion.div
        animate={showRipple ? { scale: [1, 1.22, 0.90, 1.06, 1] } : {}}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {/* Ripple rings on land */}
        {showRipple && (
          <>
            <div className="pin-ripple"       style={{ width: 70, height: 70 }} />
            <div className="pin-ripple pin-ripple-2" style={{ width: 70, height: 70 }} />
            <div className="pin-ripple pin-ripple-3" style={{ width: 70, height: 70 }} />
          </>
        )}

        {/* Pin body — teardrop SVG */}
        <svg width={64} height={80} viewBox="0 0 64 80" style={{ filter: 'drop-shadow(0 0 18px rgba(0,212,255,0.65))' }}>
          <defs>
            <radialGradient id="pinGrad" cx="40%" cy="30%" r="60%">
              <stop offset="0%"   stopColor="#00FFFF" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00D4FF" stopOpacity="0.06" />
            </radialGradient>
          </defs>
          {/* Outer pin shape */}
          <path
            d="M32 2 C18 2 7 13 7 27 C7 44 32 74 32 74 C32 74 57 44 57 27 C57 13 46 2 32 2 Z"
            fill="url(#pinGrad)"
            stroke="#00D4FF"
            strokeWidth="1.5"
          />
          {/* Inner core */}
          <circle cx={32} cy={27} r={10} fill="rgba(0,212,255,0.15)" stroke="#00FFFF" strokeWidth="1.5" />
          <circle cx={32} cy={27} r={4}  fill="#00FFFF" />
        </svg>
      </motion.div>

      {/* Signal locked badge */}
      <AnimatePresence>
        {showRipple && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '5px 14px', borderRadius: 20,
              background: 'rgba(0,212,255,0.07)',
              border: '1px solid rgba(0,212,255,0.22)',
            }}
          >
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: '#00E676', animation: 'breathe 1s ease-in-out infinite',
            }} />
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              letterSpacing: '0.18em', color: 'rgba(0,212,255,0.80)',
              textTransform: 'uppercase', fontWeight: 600,
            }}>
              SIGNAL LOCKED
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Phase 2: System Calibration ──────────────────────────────────────────────
function CalibrationPhase({ steps, title, onDone }: {
  steps: string[];
  title: string;
  onDone: () => void;
}) {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    steps.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveStep(i), 350 + i * 520));
    });
    timers.push(setTimeout(onDone, 350 + steps.length * 520 + 400));
    return () => timers.forEach(clearTimeout);
  }, [steps, onDone]);

  const progress = Math.round(((activeStep + 1) / steps.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, width: 300 }}
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, letterSpacing: '0.6em' }}
        animate={{ opacity: 1, letterSpacing: '0.22em' }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        style={{
          fontSize: 10, fontFamily: 'JetBrains Mono, monospace',
          color: 'rgba(0,212,255,0.80)', textTransform: 'uppercase',
          fontWeight: 700, letterSpacing: '0.22em',
        }}
      >
        {title}
      </motion.div>

      {/* Progress bar */}
      <div style={{ width: '100%', height: 1.5, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #00D4FF, #00E676)',
            borderRadius: 1,
            boxShadow: '0 0 8px rgba(0,212,255,0.5)',
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
        {steps.map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0.12 }}
            animate={{ opacity: i <= activeStep ? 1 : 0.18 }}
            transition={{ duration: 0.28 }}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <motion.div
              animate={{
                background: i <= activeStep ? '#00E676' : 'rgba(255,255,255,0.12)',
                boxShadow: i <= activeStep ? '0 0 6px rgba(0,230,118,0.6)' : 'none',
              }}
              transition={{ duration: 0.25 }}
              style={{ width: 5, height: 5, borderRadius: '50%', flexShrink: 0 }}
            />
            <span style={{
              fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
              color: i <= activeStep ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.20)',
              letterSpacing: '0.10em', textTransform: 'uppercase',
            }}>
              {step}
            </span>
            {i <= activeStep && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  marginLeft: 'auto', fontSize: 8,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#00E676', letterSpacing: '0.06em',
                }}
              >
                OK
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Login Card ────────────────────────────────────────────────────────────────
interface CardProps { isDark: boolean; s: typeof COPY.en; onEnter: (name: string) => void; }

function LoginCard({ isDark, s, onEnter }: CardProps) {
  const { language, setLanguage } = useAppLanguage();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        setError(language === 'ar' ? 'الاسم مطلوب للمتابعة' : 'Name is required to continue');
        return;
      }
      setError('');
      onEnter(trimmed);
    },
    [name, language, onEnter],
  );

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 13,
    fontFamily: 'Inter, -apple-system, sans-serif',
    letterSpacing: '-0.022em',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.10)',
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.70)',
    color: isDark ? 'rgba(255,255,255,0.88)' : '#1D1D1F',
    outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s',
  };

  return (
    <motion.div
      key="card"
      className="login-card-wrapper"
      initial={{ opacity: 0, y: 32, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`panel login-card${isDark ? '' : ' login-card-light'}`}>
        <div className="login-neural-link" aria-hidden="true" />

        <motion.div variants={CONTAINER} initial="hidden" animate="show"
          style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Logo */}
          <motion.div variants={ITEM}
            style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26 }}>
            <div className={`login-icon${isDark ? '' : ' login-icon-light'}`}>
              {/* Inline SVG nav pin for crisp rendering at small size */}
              <svg width={22} height={28} viewBox="0 0 22 28"
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,212,255,0.5))' }}>
                <path
                  d="M11 1 C5.5 1 1 5.5 1 11 C1 18 11 27 11 27 C11 27 21 18 21 11 C21 5.5 16.5 1 11 1 Z"
                  fill="rgba(0,212,255,0.10)" stroke="#00D4FF" strokeWidth="1.4"
                />
                <circle cx={11} cy={11} r={4} fill="rgba(0,212,255,0.20)" stroke="#00FFFF" strokeWidth="1.2" />
                <circle cx={11} cy={11} r={1.8} fill="#00FFFF" />
              </svg>
            </div>
            <div>
              <div style={{
                fontSize: 26, fontWeight: 700,
                letterSpacing: '-0.05em',
                color: isDark ? 'rgba(255,255,255,0.94)' : '#1D1D1F',
                lineHeight: 1.05,
              }}>
                {s.title}
              </div>
              <div style={{
                fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.20em', textTransform: 'uppercase',
                color: isDark ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.30)',
                marginTop: 5,
              }}>
                {s.badge}
              </div>
            </div>
          </motion.div>

          <motion.div variants={ITEM} className="divider" style={{ marginBottom: 22 }} />

          <motion.p variants={ITEM} style={{
            fontSize: 12.5, lineHeight: 1.68, fontWeight: 350,
            letterSpacing: '-0.010em',
            color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.42)',
            marginBottom: 28,
          }}>
            {s.tagline}
          </motion.p>

          <motion.form variants={ITEM} onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Name input */}
            <div>
              <div style={{
                fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.30)',
                marginBottom: 8,
              }}>
                {s.nameLabel}
              </div>
              <input
                ref={inputRef}
                type="text" value={name}
                onChange={(e) => { setName(e.target.value); if (error) setError(''); }}
                placeholder={s.namePh}
                className="eco-search-input"
                autoComplete="off" maxLength={40}
                style={inputBase}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(0,212,255,0.40)';
                  e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(0,212,255,0.09)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.10)';
                  e.currentTarget.style.boxShadow   = 'none';
                }}
              />
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    marginTop: 7, fontSize: 9,
                    letterSpacing: '0.04em',
                    color: '#FF7A8A',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {error}
                </motion.div>
              )}
            </div>

            {/* Language selector */}
            <div>
              <div style={{
                fontSize: 8, fontFamily: 'JetBrains Mono, monospace',
                letterSpacing: '0.16em', textTransform: 'uppercase',
                color: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(0,0,0,0.30)',
                marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <Globe size={8} />{s.langHint}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['en', 'ar'] as const).map((lang) => {
                  const active = language === lang;
                  return (
                    <motion.button key={lang} type="button"
                      whileTap={{ scale: 0.93 }}
                      onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 10,
                        fontFamily: 'JetBrains Mono, monospace',
                        letterSpacing: '0.10em', fontWeight: 600, cursor: 'pointer',
                        border:     active ? '1px solid rgba(0,212,255,0.44)' : isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
                        background: active ? 'rgba(0,212,255,0.09)' : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        color:      active ? '#00D4FF'               : isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.30)',
                        transition: 'all 0.18s ease',
                        boxShadow:  active ? '0 0 12px rgba(0,212,255,0.10)' : 'none',
                      }}>
                      {lang === 'en' ? 'ENGLISH' : 'عربي'}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.015, boxShadow: '0 0 36px rgba(0,212,255,0.22), 0 4px 24px rgba(0,0,0,0.30)' }}
              whileTap={{ scale: 0.975 }}
              disabled={!name.trim()}
              style={{
                marginTop: 6, width: '100%', padding: '14px 0', borderRadius: 13,
                background: name.trim()
                  ? 'linear-gradient(135deg, rgba(0,212,255,0.16) 0%, rgba(0,212,255,0.08) 100%)'
                  : 'rgba(255,255,255,0.03)',
                border: name.trim()
                  ? '1px solid rgba(0,212,255,0.35)'
                  : isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
                color: name.trim() ? '#00D4FF' : isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: name.trim() ? '0 2px 18px rgba(0,212,255,0.10)' : 'none',
                transition: 'background 0.2s, border-color 0.2s, color 0.2s',
              }}
            >
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                letterSpacing: '0.20em', fontWeight: 700,
              }}>
                {s.cta}
              </span>
              <ArrowRight size={13} strokeWidth={2.5} />
            </motion.button>
          </motion.form>

          <motion.div variants={ITEM} style={{
            marginTop: 24, textAlign: 'center', fontSize: 8,
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
            color: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.16)',
          }}>
            {s.note}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── LoginPage — master orchestrator ──────────────────────────────────────────
type BootPhase = 'pin' | 'calibrate' | 'card';

export const LoginPage = memo(function LoginPage({ onEnter }: Props) {
  const { language }   = useAppLanguage();
  const { theme }      = useAppTheme();
  const [phase, setPhase] = useState<BootPhase>('pin');
  const isDark = theme === 'dark';
  const s = COPY[language];

  const handlePinLanded    = useCallback(() => setPhase('calibrate'), []);
  const handleCalibDone    = useCallback(() => setPhase('card'), []);

  return (
    <div
      className="login-root"
      style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
    >
      {/* Blurred aerial map bg */}
      <div className={`login-map-bg${isDark ? '' : ' login-map-bg-light'}`} />

      {/* Ambient orbs */}
      <div className={`login-orb login-orb-1${isDark ? '' : ' login-orb-light'}`} />
      <div className={`login-orb login-orb-2${isDark ? '' : ' login-orb-light'}`} />

      <AnimatePresence mode="wait">
        {phase === 'pin' && (
          <motion.div key="pin"
            exit={{ opacity: 0, scale: 1.06, transition: { duration: 0.40, ease: [0.4, 0, 0.2, 1] } }}
          >
            <PinDropPhase onLanded={handlePinLanded} />
          </motion.div>
        )}

        {phase === 'calibrate' && (
          <motion.div key="calibrate"
            exit={{ opacity: 0, y: -16, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <CalibrationPhase
              steps={s.steps}
              title={s.calibTitle}
              onDone={handleCalibDone}
            />
          </motion.div>
        )}

        {phase === 'card' && (
          <LoginCard key="card" isDark={isDark} s={s} onEnter={onEnter} />
        )}
      </AnimatePresence>
    </div>
  );
});
