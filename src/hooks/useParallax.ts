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
    let target = { x: 0, y: 0 };
    let current = { x: 0, y: 0 };

    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      target = {
        x: ((e.clientX - cx) / cx) * intensity,
        y: ((e.clientY - cy) / cy) * intensity,
      };
    };

    // Smooth lerp so it feels organic
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const tick = () => {
      current.x = lerp(current.x, target.x, 0.08);
      current.y = lerp(current.y, target.y, 0.08);
      setOffset({ x: +current.x.toFixed(3), y: +current.y.toFixed(3) });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [intensity]);

  return offset;
}
