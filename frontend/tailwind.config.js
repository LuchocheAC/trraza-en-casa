/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          blue: {
            DEFAULT: '#1A4FA0',
            dark:    '#153d80',
            light:   '#dde6f5',
            muted:   '#8aaad6',
          },
          yellow: {
            DEFAULT: '#F5C400',
            light:   '#fdf6cc',
          },
        },
      },
    },
  },
  plugins: [],
};
