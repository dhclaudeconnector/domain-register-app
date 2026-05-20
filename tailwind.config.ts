import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
    './stores/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-active': 'var(--color-primary-active)',
        'primary-disabled': 'var(--color-primary-disabled)',
        ink: 'var(--color-ink)',
        body: 'var(--color-body)',
        muted: 'var(--color-muted)',
        'muted-soft': 'var(--color-muted-soft)',
        hairline: 'var(--color-hairline)',
        'hairline-soft': 'var(--color-hairline-soft)',
        canvas: 'var(--color-canvas)',
        surface: {
          soft: 'var(--color-surface-soft)',
          strong: 'var(--color-surface-strong)',
          dark: 'var(--color-surface-dark)',
          elevated: 'var(--color-surface-dark-elevated)'
        },
        'on-primary': 'var(--color-on-primary)',
        'on-dark': 'var(--color-on-dark)',
        'on-dark-soft': 'var(--color-on-dark-soft)',
        semantic: {
          up: 'var(--color-semantic-up)',
          down: 'var(--color-semantic-down)'
        }
      },
      borderRadius: {
        xs: 'var(--rounded-xs)',
        sm: 'var(--rounded-sm)',
        md: 'var(--rounded-md)',
        lg: 'var(--rounded-lg)',
        xl: 'var(--rounded-xl)',
        pill: 'var(--rounded-pill)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      boxShadow: {
        card: '0 16px 40px rgba(10, 11, 13, 0.06)'
      }
    }
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
