/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'jd-red': '#E2231A',
        'jd-orange': '#FF6600',
        'sidebar': '#1a1a2e',
      },
    },
  },
  plugins: [],
}

