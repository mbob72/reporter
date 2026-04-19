const path = require('node:path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, 'src/**/*.{ts,tsx}'),
    path.join(__dirname, '.storybook/**/*.{ts,tsx}'),
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        canvas: '#f4f0e6',
        surface: '#fbf7ef',
        ink: '#24303f',
        accent: '#9a6a1f',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(51, 38, 15, 0.16)',
      },
    },
  },
  plugins: [],
};
