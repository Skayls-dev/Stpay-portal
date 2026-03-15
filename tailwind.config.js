/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        'sp-page':   '#F5F4F0',
        'sp-card':   '#FFFFFF',
        'sp-subtle': '#FAFAF8',
        'sp-hover':  '#F5F4F0',
        'sp-orange': '#FF6600',
        'sp-orange-dark': '#E55A00',
        'sp-text-1': '#1A1A1A',
        'sp-text-2': '#6B6860',
        'sp-text-3': '#9E9B91',
        'sp-text-4': '#C0BDB4',
        'sp-border': '#EBEBEB',
        'sp-green':  '#1A7A40',
        'sp-red':    '#C02020',
        'sp-amber':  '#954A00',
        'sp-blue':   '#1A5FA5',
      },
      borderRadius: {
        'sp-sm': '6px',
        'sp-md': '10px',
        'sp-lg': '14px',
      },
    },
  },
  plugins: [],
}
