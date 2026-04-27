import { useEffect, useState } from 'react';

export interface ParallaxOffset {
  x: number;
  y: number;
}

/**
 * Tracks mouse position and returns a normalized offset for 3D parallax.
 * Returns values in range [-intensity, +intensity] pixels.
 */
export function useParallax(intensity = 6): ParallaxOffset {
  const [offset, setOffset] = useState<ParallaxOffset>({ x: 0, y: 0 });

  useEffect(() => {
    let raf = 0;
    let ticking = false;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const next = {
        x: ((e.clientX - cx) / cx) * intensity,
        y: ((e.clientY - cy) / cy) * intensity,
      };
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(() => {
        ticking = false;
        setOffset((prev) => {
          // Tiny epsilon guard keeps React from doing no-op renders.
          if (Math.abs(prev.x - next.x) < 0.01 && Math.abs(prev.y - next.y) < 0.01) return prev;
          return { x: +next.x.toFixed(3), y: +next.y.toFixed(3) };
        });
      });
    };

    window.addEventListener('mousemove', onMove, { passive: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return offset;
}
