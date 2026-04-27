import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation2, Loader2 } from 'lucide-react';
import { useThemeColors } from '../context/AppContext';
import { useT } from '../i18n';
import type { LatLng } from '../types';

// Fixed origin: Abdali Boulevard, Amman
export const SEARCH_DEFAULT_ORIGIN: LatLng = { lat: 31.9769, lng: 35.9095 };

export interface SearchSelectPayload {
  origin:   LatLng;
  destination: LatLng;
  destName: string;
}

interface SearchBarProps {
  isLoaded: boolean;
  onSelect: (payload: SearchSelectPayload) => void;
  loading?: boolean;
}

export function SearchBar({ isLoaded, onSelect, loading = false }: SearchBarProps) {
  const inputRef             = useRef<HTMLInputElement>(null);
  const autocompleteRef      = useRef<google.maps.places.Autocomplete | null>(null);
  const onSelectRef          = useRef(onSelect);
  onSelectRef.current        = onSelect;

  const tc   = useThemeColors();
  const t    = useT();
  const [value, setValue]    = useState('');
  const [focused, setFocused] = useState(false);

  const initAutocomplete = useCallback(() => {
    if (!isLoaded || !inputRef.current || autocompleteRef.current) return;
    if (!window.google?.maps?.places?.Autocomplete) return;

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types:                 ['geocode', 'establishment'],
      componentRestrictions: { country: 'jo' }, // Jordan only
      fields:                ['geometry', 'name', 'formatted_address'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      if (!place.geometry?.location) return;
      const dest: LatLng = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      const destName = place.name ?? place.formatted_address ?? 'Destination';
      setValue(destName);
      onSelectRef.current({ origin: SEARCH_DEFAULT_ORIGIN, destination: dest, destName });
    });

    autocompleteRef.current = ac;
  }, [isLoaded]);

  useEffect(() => {
    initAutocomplete();
  }, [initAutocomplete]);

  // Reset autocomplete if Maps reloads
  useEffect(() => {
    if (!isLoaded) autocompleteRef.current = null;
  }, [isLoaded]);

  const borderColor = focused
    ? 'rgba(0,212,255,0.45)'
    : tc.divider;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, type: 'spring', stiffness: 140, damping: 22 }}
      style={{ width: '100%', marginBottom: 8 }}
    >
      <div
        style={{
          background:    tc.scoreRingBg,
          border:        `1px solid ${borderColor}`,
          borderRadius:  12,
          display:       'flex',
          alignItems:    'center',
          gap:           8,
          padding:       '7px 12px',
          transition:    'border-color 0.2s',
        }}
      >
        {/* Origin pill */}
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        4,
            background: 'rgba(0,212,255,0.08)',
            border:     '1px solid rgba(0,212,255,0.18)',
            borderRadius: 6,
            padding:    '3px 7px',
            flexShrink: 0,
          }}
        >
          <Navigation2 size={10} color="#00D4FF" />
          <span
            style={{
              fontSize:      9,
              color:         '#00D4FF',
              fontFamily:    'JetBrains Mono, monospace',
              letterSpacing: '0.08em',
              fontWeight:    600,
            }}
          >
            {t.search.from}
          </span>
        </div>

        <MapPin size={11} color={tc.textDim} style={{ flexShrink: 0 }} />

        <input
          ref={inputRef}
          type="text"
          className="eco-search-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t.search.placeholder}
          autoComplete="off"
          style={{
            flex:        1,
            background:  'none',
            border:      'none',
            outline:     'none',
            fontSize:    11,
            color:       tc.textPrimary,
            fontFamily:  'Inter, -apple-system, sans-serif',
            minWidth:    0,
          }}
        />

        {loading ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
            style={{ flexShrink: 0, display: 'flex' }}
          >
            <Loader2 size={12} color="#00D4FF" />
          </motion.div>
        ) : (
          <span
            style={{
              fontSize:      8,
              color:         tc.textDim,
              fontFamily:    'JetBrains Mono, monospace',
              letterSpacing: '0.1em',
              flexShrink:    0,
            }}
          >
            AMM
          </span>
        )}
      </div>
    </motion.div>
  );
}
