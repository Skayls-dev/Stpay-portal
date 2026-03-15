/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1a56db',
          light: '#e8f0fd',
          dark: '#1239a0',
        },
        surface: '#f9fafb',
        muted: '#6b7280',
      },
      borderRadius: {
        card: '10px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

