import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          50: '#fdf2f4',
          100: '#fbe6ea',
          200: '#f5c6d0',
          300: '#ec98aa',
          400: '#d95f7b',
          500: '#b23a56',
          600: '#8f2a43',
          700: '#71213a',
          800: '#4f1a2c',
          900: '#3a1221',
        },
        forest: {
          50: '#f0f7f2',
          100: '#dcebe1',
          200: '#b8d6c3',
          300: '#8cb99d',
          400: '#5b9371',
          500: '#3c7655',
          600: '#2e5e43',
          700: '#254b37',
          800: '#1d3a2b',
          900: '#14281e',
        },
        gold: {
          50: '#fdf8ec',
          100: '#f9edcb',
          200: '#f2d98b',
          300: '#eac652',
          400: '#ddab2e',
          500: '#c48d22',
          600: '#a06b1c',
          700: '#7f511b',
          800: '#69411c',
          900: '#59371a',
        },
        cream: '#fdf6e9',
      },
      fontFamily: {
        display: ['var(--font-display)', 'ui-serif', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shimmer: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        shimmer: 'shimmer 6s ease infinite',
      },
    },
  },
  plugins: [],
};

export default config;
