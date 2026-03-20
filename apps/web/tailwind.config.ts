import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#0a0a0c',
          1: '#111114',
          2: '#1a1a1f',
          3: '#232329',
          4: '#2c2c34',
        },
        border: {
          DEFAULT: '#2c2c34',
          hover: '#3d3d47',
        },
        accent: {
          DEFAULT: '#c8a2ff',
          dim: '#9a6dd7',
          bright: '#e0c8ff',
        },
        danger: {
          DEFAULT: '#ff6b6b',
          dim: '#cc4444',
        },
        success: {
          DEFAULT: '#4ecdc4',
        },
        text: {
          primary: '#e8e8ed',
          secondary: '#8e8e9a',
          tertiary: '#5a5a66',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
