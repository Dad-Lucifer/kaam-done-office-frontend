/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#070709',
        elevated: '#111114',
        surface: '#1A1A1F',
        'purple-primary': '#7C3AED',
        'purple-light': '#A78BFA',
        'green-accent': '#10B981',
        'gold-accent': '#D4AF37',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A1A1AA',
        'text-tertiary': '#71717A',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
