import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#001915',
          container: '#0f2e2a',
          fixed: '#c8e9e3',
          'fixed-dim': '#adcdc7',
        },
        'on-primary': {
          DEFAULT: '#ffffff',
          container: '#779691',
          fixed: '#00201c',
          'fixed-variant': '#2e4c48',
        },
        secondary: {
          DEFAULT: '#735c00',
          container: '#fed65b',
          fixed: '#ffe088',
          'fixed-dim': '#e9c349',
        },
        'on-secondary': {
          DEFAULT: '#ffffff',
          container: '#745c00',
          fixed: '#241a00',
          'fixed-variant': '#574500',
        },
        tertiary: {
          DEFAULT: '#260e07',
          container: '#3e2219',
          fixed: '#ffdbd0',
          'fixed-dim': '#ebbcae',
        },
        'on-tertiary': {
          DEFAULT: '#ffffff',
          container: '#b1877a',
          fixed: '#2e150c',
          'fixed-variant': '#603f34',
        },
        surface: {
          DEFAULT: '#faf9f7',
          dim: '#dadad8',
          bright: '#faf9f7',
          variant: '#e3e2e0',
          tint: '#46645f',
          container: {
            lowest: '#ffffff',
            low: '#f4f3f1',
            DEFAULT: '#efeeec',
            high: '#e9e8e6',
            highest: '#e3e2e0',
          },
        },
        'on-surface': {
          DEFAULT: '#1a1c1b',
          variant: '#414847',
        },
        'inverse-surface': '#2f3130',
        'inverse-on-surface': '#f1f1ef',
        'inverse-primary': '#adcdc7',
        outline: {
          DEFAULT: '#717977',
          variant: '#c1c8c6',
        },
        background: '#faf9f7',
        'on-background': '#1a1c1b',
        error: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
        },
        'on-error': {
          DEFAULT: '#ffffff',
          container: '#93000a',
        },
      },
      fontFamily: {
        serif: ['var(--font-libre-caslon)', 'Libre Caslon Text', 'Georgia', 'serif'],
        sans: ['var(--font-hanken)', 'Hanken Grotesk', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        sm: '0.125rem',
        md: '0.25rem',
        lg: '0.375rem',
        xl: '0.5rem',
        full: '9999px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
    },
  },
  plugins: [],
};

export default config;
