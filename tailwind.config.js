/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jungo: {
          green: {
            50: '#f3f8ec',
            100: '#e4efd5',
            200: '#cbdfb0',
            300: '#a9c981',
            400: '#8ab55a',
            500: '#5B8C2A',
            600: '#4a7322',
            700: '#3a5a1b',
            800: '#2f4817',
            900: '#253813',
          },
          brown: {
            50: '#f9f3ef',
            100: '#efe2d8',
            200: '#dec3ae',
            300: '#c99e7e',
            400: '#b47c56',
            500: '#6B4226',
            600: '#5a3720',
            700: '#492d1a',
            800: '#3a2415',
            900: '#2d1c10',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
