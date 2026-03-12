/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        echo: {
          base: '#0a0b13',
          surface: '#151827',
          panel: '#1d2235',
          accent: '#6d5dfc',
          accentSoft: '#8c7dff',
        },
      },
      boxShadow: {
        glow: '0 0 40px rgba(109,93,252,0.25)',
      },
      backgroundImage: {
        'echo-gradient': 'linear-gradient(135deg, #6d5dfc 0%, #8f4dff 100%)',
      },
    },
  },
  plugins: [],
};
