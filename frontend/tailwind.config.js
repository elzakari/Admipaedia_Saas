/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        // Base theme colors
        primary: {
          DEFAULT: '#4f46e5', // indigo-600
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Gradient theme colors
        gradient: {
          primary: '#667eea',
          secondary: '#764ba2',
          accent: '#f093fb',
          pink: '#f5576c',
          light: '#e3f2fd',
          purple: '#f3e5f5',
          orange: '#fff3e0',
        },
        // CasaOS theme colors
        casaos: {
          bg: '#0E1218',
          card: '#12151C',
          blue: '#3B82F6',
          'blue-light': '#5B8CFF',
          green: '#10B981',
          border: 'rgba(255, 255, 255, 0.08)',
        },
        // Semantic colors that change with theme
        background: {
          DEFAULT: 'var(--background)',
          secondary: 'var(--background-secondary)',
        },
        foreground: {
          DEFAULT: 'var(--foreground)',
          secondary: 'var(--foreground-secondary)',
        },
        glass: {
          DEFAULT: 'rgba(255, 255, 255, 0.2)',
          dark: 'rgba(15, 23, 42, 0.3)',
        },
        // Add ring color definition
        ring: 'var(--ring)',
        input: 'var(--input)', // Add this line
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
        'glass-gradient-dark': 'linear-gradient(135deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.1))',
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-secondary': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'gradient-background': 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 50%, #fff3e0 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
        'gradient-glass': 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'spin-slower': 'spin 5s linear infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
  ],
};
