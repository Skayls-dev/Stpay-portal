/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        /* ── base surfaces ── */
        'st-base':    '#0E0F14',
        'st-raised':  '#13151C',
        'st-overlay': '#1A1D27',
        'st-subtle':  '#21253A',

        /* ── brand gold ── */
        'st-gold':       '#F5A623',
        'st-gold-bright':'#FFCF6B',

        /* ── semantic ── */
        'st-green':  '#22C55E',
        'st-red':    '#EF4444',
        'st-amber':  '#F59E0B',
        'st-blue':   '#3B82F6',

        /* ── text ── */
        'st-text':   '#F0F1F5',
        'st-text-2': '#8A8EA6',
        'st-text-3': '#5A5E78',
      },
      borderColor: {
        'st-soft':   'rgba(255,255,255,0.07)',
        'st-medium': 'rgba(255,255,255,0.12)',
      },
      borderRadius: {
        'st-sm': '6px',
        'st-md': '10px',
        'st-lg': '14px',
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}