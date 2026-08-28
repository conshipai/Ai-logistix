import type { Config } from 'tailwindcss'

/**
 * MConnect design tokens.
 *
 * The palette is deliberately institutional: a deep navy ("ink") base with a
 * restrained slate neutral ramp, and the AI Logistix orange retained as a
 * single accent so the product reads as "powered by AI Logistix" without
 * looking like a consumer startup.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f2f5f9',
          100: '#e3e9f2',
          200: '#c6d2e4',
          300: '#9aaecd',
          400: '#6883b0',
          500: '#476296',
          600: '#374e7c',
          700: '#2d3f64',
          800: '#243250',
          900: '#101b30',
          950: '#0a1220',
        },
        accent: {
          50: '#fff4ed',
          100: '#ffe5d4',
          200: '#ffc7a8',
          300: '#ffa070',
          400: '#ff7a35',
          500: '#f26522',
          600: '#d94e0f',
          700: '#b43c0f',
          800: '#8f3114',
          900: '#742b13',
        },
        positive: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#0f9d6e',
          600: '#0b7f59',
          700: '#0a6547',
        },
        caution: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#d9930b',
          600: '#b47509',
          700: '#8f5c07',
        },
        critical: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#dc2626',
          600: '#b91c1c',
          700: '#991b1b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'ui-serif', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 27 48 / 0.04), 0 1px 3px 0 rgb(16 27 48 / 0.06)',
        raised: '0 4px 12px -2px rgb(16 27 48 / 0.10), 0 2px 4px -2px rgb(16 27 48 / 0.06)',
      },
    },
  },
  plugins: [],
}

export default config
