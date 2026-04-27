import { useRef, useState, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Globe, Sun, Moon, Check } from 'lucide-react';
import { useApp, useThemeColors, type Language, type Theme } from '../context/AppContext';
import { useT } from '../i18n';

const SPRING = { type: 'spring', stiffness: 300, damping: 28 } as const;

// ─── Avatar Circle ─────────────────────────────────────────────────────────────
function AvatarCircle({ name, avatar, size = 52 }: { name: string; avatar: string | null; size?: number }) {
  const initials = name
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatar ? 'transparent' : 'rgba(0,212,255,0.1)',
      border: '1.5px solid rgba(0,212,255,0.28)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0,
    }}>
      {avatar ? (
        <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: size * 0.3, fontWeight: 600,
          color: '#00D4FF', letterSpacing: '-0.02em',
        }}>
          {initials}
        </span>
      )}
    </div>
  );
}

// ─── Segment Toggle ────────────────────────────────────────────────────────────
function SegmentToggle<T extends string>({
  options,
  value,
  onChange,
  groupId,
}: {
  options: { value: T; label: string; icon?: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  groupId: string;
}) {
  const tc = useThemeColors();
  return (
    <div style={{
      display: 'flex',
      background: tc.settingsSegBg,
      border: `1px solid ${tc.settingsSegBorder}`,
      borderRadius: 11, padding: 3, gap: 3,
    }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, border: 'none', borderRadius: 9,
            padding: '8px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            transition: 'color 0.18s',
            background: 'transparent',
            color: value === opt.value ? tc.settingsSegActive : tc.settingsSegInactive,
            position: 'relative',
          }}
        >
          {value === opt.value && (
            <motion.div
              layoutId={`${groupId}-indicator`}
              style={{
                position: 'absolute', inset: 0, borderRadius: 9,
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.22)',
              }}
              transition={SPRING}
            />
          )}
          <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 5 }}>
            {opt.icon}
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  const tc = useThemeColors();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <span style={{ color: tc.settingsSecIcon, display: 'flex' }}>{icon}</span>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: tc.settingsSecLabel }}>
        {text}
      </span>
    </div>
  );
}

// ─── SettingsHub ───────────────────────────────────────────────────────────────
interface SettingsHubProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function SettingsHub({ isOpen, onClose }: SettingsHubProps) {
  const { language, theme, profile, setLanguage, setTheme, updateProfile } = useApp();
  const tc = useThemeColors();
  const t  = useT();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState(profile.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed) updateProfile({ name: trimmed });
    setEditingName(false);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateProfile({ avatar: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const DIVIDER = (
    <div style={{ height: 1, background: tc.settingsDivider, margin: '18px 0' }} />
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 99,
              background: 'rgba(0,0,0,0.18)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={SPRING}
            style={{
              position: 'fixed',
              top: 62,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 100,
              width: 330,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="panel" style={{ borderRadius: 22, padding: '22px 22px 18px', overflow: 'hidden' }}>

              {/* ── Header ── */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: tc.settingsTitle }}>
                  {t.settings.title}
                </span>
                <button
                  onClick={onClose}
                  style={{
                    background: tc.closeBtn,
                    border: `1px solid ${tc.closeBtnBorder}`,
                    borderRadius: 8, width: 28, height: 28,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(127,127,127,0.12)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = tc.closeBtn; }}
                >
                  <X size={13} color={tc.closeIcon} />
                </button>
              </div>

              {/* ── Profile ── */}
              <SectionLabel icon={<User size={10} />} text={t.settings.profile} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                {/* Avatar — click to upload */}
                <div
                  style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
                  title="Change photo"
                  onClick={() => fileRef.current?.click()}
                >
                  <AvatarCircle name={profile.name} avatar={profile.avatar} size={54} />
                  <div
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0)',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.42)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'; }}
                  >
                    <User size={16} color="rgba(255,255,255,0)" style={{ pointerEvents: 'none' }} />
                  </div>
                  <input
                    ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingName ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        autoFocus
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameSave();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        style={{
                          flex: 1, minWidth: 0,
                          background: tc.settingsInput,
                          border: '1px solid rgba(0,212,255,0.35)',
                          borderRadius: 8, padding: '6px 10px',
                          color: tc.textPrimary, fontSize: 13,
                          outline: 'none', fontFamily: 'inherit',
                        }}
                      />
                      <button
                        onClick={handleNameSave}
                        style={{
                          background: 'rgba(0,212,255,0.12)',
                          border: '1px solid rgba(0,212,255,0.28)',
                          borderRadius: 8, padding: '6px 10px',
                          cursor: 'pointer', display: 'flex',
                          alignItems: 'center', color: '#00D4FF',
                        }}
                      >
                        <Check size={13} />
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setNameInput(profile.name); setEditingName(true); }}
                    >
                      <div style={{
                        fontSize: 15, fontWeight: 500, letterSpacing: '-0.02em',
                        color: tc.textPrimary, marginBottom: 3,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {profile.name}
                      </div>
                      <div style={{ fontSize: 10, color: tc.textDim, letterSpacing: '0.04em' }}>
                        {t.settings.tapToEdit}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {DIVIDER}

              {/* ── Language ── */}
              <SectionLabel icon={<Globe size={10} />} text={t.settings.language} />
              <SegmentToggle<Language>
                groupId="lang"
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية' },
                ]}
                value={language}
                onChange={setLanguage}
              />
              <AnimatePresence>
                {language === 'ar' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      fontSize: 10, color: 'rgba(0,212,255,0.5)',
                      letterSpacing: '0.04em', textAlign: 'center',
                      padding: '4px 0', fontFamily: 'inherit',
                    }}>
                      {t.settings.arabicNote}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {DIVIDER}

              {/* ── Appearance ── */}
              <SectionLabel icon={<Sun size={10} />} text={t.settings.appearance} />
              <SegmentToggle<Theme>
                groupId="theme"
                options={[
                  { value: 'dark',  label: t.settings.dark,  icon: <Moon size={12} /> },
                  { value: 'light', label: t.settings.light, icon: <Sun  size={12} /> },
                ]}
                value={theme}
                onChange={setTheme}
              />
              <AnimatePresence>
                {theme === 'light' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{
                      fontSize: 10, color: tc.textDim,
                      letterSpacing: '0.04em', textAlign: 'center', padding: '4px 0',
                    }}>
                      {t.settings.lightNote}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Footer ── */}
              <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <div style={{
                  width: 4, height: 4, borderRadius: '50%', background: '#00E676',
                  animation: 'breathe 2s ease-in-out infinite',
                }} />
                <span style={{ fontSize: 9, color: tc.settingsFooter, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {t.settings.footer}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
