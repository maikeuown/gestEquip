import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 900: '#1e3a8a' },
        sidebar: { bg: '#0f172a', hover: '#1e293b', active: '#2563eb', text: '#94a3b8', activeText: '#ffffff' },
      },
    },
  },
  plugins: [],
};

export default config;
