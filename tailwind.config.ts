import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1.05rem' }],
        'xs': ['0.8125rem', { lineHeight: '1.15rem' }],
        'sm': ['0.875rem', { lineHeight: '1.35rem' }],
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg': ['1.0625rem', { lineHeight: '1.6rem' }],
        'xl': ['1.3125rem', { lineHeight: '1.8rem' }],
        '2xl': ['1.5625rem', { lineHeight: '2.05rem' }],
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        // Semantic tokens (values in globals.css, per theme).
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        elevated: 'var(--elevated)',
        sunken: 'var(--sunken)',
        hover: 'var(--hover)',
        active: 'var(--active)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        fg: 'var(--fg)',
        'fg-muted': 'var(--fg-muted)',
        'fg-subtle': 'var(--fg-subtle)',
        inverse: 'var(--inverse)',
        'on-inverse': 'var(--on-inverse)',
        accent: 'var(--accent)',
        'near-black': '#0a0a0a',
        // Neutral accent; its shade is set per theme in globals.css (--accent)
        // so active/selected states keep contrast in both light and dark.
        'electric-violet': 'var(--accent)',
        'dark-indigo-glow': '#18181b',
        slate: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        }
      },
      borderRadius: {
        control: '8px',
        card: '12px',
        panel: '14px',
      },
      boxShadow: {
        pop: 'var(--shadow-pop)',
        card: 'var(--shadow-card)',
        highlight: 'var(--highlight)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'progress-indefinite': 'progress 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        shimmer: 'tx-shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
} satisfies Config;
