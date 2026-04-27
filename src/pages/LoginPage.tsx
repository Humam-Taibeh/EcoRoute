import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Navigation2, ArrowRight, Globe } from 'lucide-react';
import { useAppLanguage, useAppTheme } from '../context/AppContext';

interface Props {
  onEnter: (name: string) => void;
}

// ─── Bilingual copy ───────────────────────────────────────────────────────────
const COPY = {
  en: {
    badge:     'AMMAN · NAVIGATION HUB',
    title:     'EcoRoute',
    tagline:   'Terrain-aware EV routing powered by real mgh physics and Gemini AI.',
    nameLabel: 'COMMANDER NAME',
    namePh:    'Enter your name',
    langHint:  'SELECT LANGUAGE',
    cta:       'INITIALIZE SYSTEM',
    note:      'v2.0 · AI Navigation · Google Maps + Gemini Flash',
  },
  ar: {
    badge:     'عمّان · مركز الملاحة',
    title:     'EcoRoute',
    tagline:   'توجيه ذكي للسيارات الكهربائية مع فيزياء mgh الحقيقية وذكاء Gemini.',
    nameLabel: 'اسم القائد',
    namePh:    'أدخل اسمك',
    langHint:  'اختر اللغة',
    cta:       'تهيئة النظام',
    note:      'v2.0 · ملاحة بالذكاء الاصطناعي · Google Maps + Gemini Flash',
  },
};

// ─── Stagger variants ─────────────────────────────────────────────────────────
const CONTAINER = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const ITEM = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.52, ease: [0.16, 1, 0.3, 1] as number[] } },
};

// ─── Boot Animation ───────────────────────────────────────────────────────────
function LoginBoot({ onComplete }: { onComplete: () => void }) {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      key="boot"
      exit={{ opacity: 0, scale: 1.04, transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] } }}
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 32, zIndex: 20,
      }}
    >
      {/* Pulsing icon */}
      <motion.div
        style={{
          width: 72, height: 72, borderRadius: 22,
          background: 'rgba(0,212,255,0.05)',
          border: '1px solid rgba(0,212,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
        }}
        animate={{
          boxShadow: [
            '0 0 0 0px rgba(0,212,255,0)',
            '0 0 0 12px rgba(0,212,255,0.08)',
            '0 0 0 0px rgba(0,212,255,0)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Navigation2 size={28} color="#00D4FF" strokeWidth={1.5} />
      </motion.div>

      {/* Boot text */}
      <div style={{ textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, letterSpacing: '0.22em' }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            fontSize: 11,
            fontFamily: 'JetBrains Mono, monospace',
            color: 'rgba(0,212,255,0.8)',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          INITIALIZING ECO-AI NEURAL LINK
        </motion.div>

        {/* Progress line */}
        <div style={{ marginTop: 20, width: 280, height: 1, background: 'rgba(255,255,255,0.06)', borderRadius: 1, overflow: 'hidden' }}>
          <motion.div
            ref={progressRef}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.6, ease: 'linear', delay: 0.2 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #00D4FF, #00E676)', borderRadius: 1 }}
          />
        </div>

        {/* Sub-steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 5 }}
        >
          {['GOOGLE MAPS · ROUTES API', 'ELEVATION ENGINE · AMMAN TERRAIN', 'GEMINI 2.0 · AI LAYER'].map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0.1 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 + i * 0.55, duration: 0.3 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 9, fontFamily: 'JetBrains Mono, monospace',
                color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em',
              }}
            >
              <motion.div
                initial={{ background: 'rgba(255,255,255,0.1)' }}
                animate={{ background: '#00E676' }}
                transition={{ delay: 0.8 + i * 0.55, duration: 0.2 }}
                style={{ width: 4, height: 4, borderRadius: '50%', flexShrink: 0 }}
              />
              {step}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── Login Card ───────────────────────────────────────────────────────────────
interface CardProps { isDark: boolean; s: typeof COPY.en; onEnter: (name: string) => void; }

function LoginCard({ isDark, s, onEnter }: CardProps) {
  const { language, setLanguage } = useAppLanguage();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

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
    [name, onEnter],
  );

  return (
    <motion.div
      key="card"
      className="login-card-wrapper"
      initial={{ opacity: 0, y: 28, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`panel login-card${isDark ? '' : ' login-card-light'}`}>
        <div className="login-neural-link" aria-hidden="true" />
        <motion.div variants={CONTAINER} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

          {/* Logo */}
          <motion.div variants={ITEM} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <div className={`login-icon${isDark ? '' : ' login-icon-light'}`}>
              <Navigation2 size={20} color="#00D4FF" strokeWidth={1.5} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.04em', color: isDark ? 'rgba(255,255,255,0.92)' : '#1D1D1F', lineHeight: 1.1 }}>{s.title}</div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.18em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.32)', marginTop: 4 }}>{s.badge}</div>
            </div>
          </motion.div>

          <motion.div variants={ITEM} className="divider" style={{ marginBottom: 22 }} />

          <motion.p variants={ITEM} style={{ fontSize: 13, lineHeight: 1.65, fontWeight: 350, color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)', marginBottom: 28 }}>
            {s.tagline}
          </motion.p>

          <motion.form variants={ITEM} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Name */}
            <div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.32)', marginBottom: 8 }}>{s.nameLabel}</div>
              <input
                type="text" value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder={s.namePh}
                className="eco-search-input"
                autoComplete="off" maxLength={40}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: 12, fontSize: 13,
                  fontFamily: 'Inter, -apple-system, sans-serif',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.1)',
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                  color: isDark ? 'rgba(255,255,255,0.85)' : '#1D1D1F',
                  outline: 'none', transition: 'border-color 0.18s, box-shadow 0.18s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,255,0.08)'; }}
                onBlur={(e)  => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {error && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    letterSpacing: '0.04em',
                    color: '#FF7A8A',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* Language */}
            <div>
              <div style={{ fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.14em', textTransform: 'uppercase', color: isDark ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.32)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Globe size={9} />{s.langHint}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['en', 'ar'] as const).map((lang) => {
                  const active = language === lang;
                  return (
                    <motion.button key={lang} type="button" whileTap={{ scale: 0.94 }} onClick={() => setLanguage(lang)}
                      style={{
                        flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 11,
                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', fontWeight: 600, cursor: 'pointer',
                        border:     active ? '1px solid rgba(0,212,255,0.42)' : isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.08)',
                        background: active ? 'rgba(0,212,255,0.08)' : isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                        color:      active ? '#00D4FF' : isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)',
                        transition: 'all 0.18s ease',
                      }}>
                      {lang === 'en' ? 'ENGLISH' : 'عربي'}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* CTA */}
            <motion.button type="submit"
              whileHover={{ scale: 1.015, boxShadow: '0 0 32px rgba(0,212,255,0.2), 0 4px 20px rgba(0,0,0,0.3)' }}
              whileTap={{ scale: 0.98 }}
              disabled={!name.trim()}
              style={{
                marginTop: 4, width: '100%', padding: '14px 0', borderRadius: 13,
                background: 'linear-gradient(135deg, rgba(0,212,255,0.14) 0%, rgba(0,212,255,0.07) 100%)',
                border: '1px solid rgba(0,212,255,0.32)', color: '#00D4FF', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 2px 14px rgba(0,212,255,0.08)', transition: 'background 0.2s, border-color 0.2s',
                opacity: name.trim() ? 1 : 0.55,
                pointerEvents: name.trim() ? 'auto' : 'none',
              }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', fontWeight: 700 }}>{s.cta}</span>
              <ArrowRight size={14} strokeWidth={2.2} />
            </motion.button>
          </motion.form>

          <motion.div variants={ITEM} style={{ marginTop: 26, textAlign: 'center', fontSize: 9, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em', color: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.18)' }}>
            {s.note}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ─── LoginPage ────────────────────────────────────────────────────────────────
export const LoginPage = memo(function LoginPage({ onEnter }: Props) {
  const { language } = useAppLanguage();
  const { theme } = useAppTheme();
  const [booted, setBooted] = useState(false);
  const isDark = theme === 'dark';
  const s      = COPY[language];

  return (
    <div className="login-root" style={{ direction: language === 'ar' ? 'rtl' : 'ltr', background: isDark ? '#050505' : '#F5F5F7' }}>
      {/* Blurred map background */}
      <div className={`login-map-bg${isDark ? '' : ' login-map-bg-light'}`} />

      {/* Ambient orbs */}
      <div className={`login-orb login-orb-1${isDark ? '' : ' login-orb-light'}`} />
      <div className={`login-orb login-orb-2${isDark ? '' : ' login-orb-light'}`} />

      <AnimatePresence mode="wait">
        {!booted ? (
          <LoginBoot key="boot" onComplete={() => setBooted(true)} />
        ) : (
          <LoginCard key="card" isDark={isDark} s={s} onEnter={onEnter} />
        )}
      </AnimatePresence>
    </div>
  );
});
