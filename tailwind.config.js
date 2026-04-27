/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyan: {
          hud: '#00D4FF',
          dim: '#0099BB',
          glow: '#00FFFF',
          dark: '#001a2e',
        },
        black: {
          true: '#000000',
          deep: '#050505',
          panel: '#0a0a0a',
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        hud: ['"Exo 2"', 'sans-serif'],
      },
      backdropBlur: {
        hud: '25px',
      },
      animation: {
        'neon-pulse': 'neonPulse 2s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
        'grid-scroll': 'gridScroll 20s linear infinite',
        'boot-glitch': 'bootGlitch 0.3s steps(3) forwards',
        blink: 'blink 1s step-end infinite',
        'ring-pulse': 'ringPulse 2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
