/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 京东品牌色
        'jd': {
          'red': '#E2231A',
          'red-dark': '#C41E15',
          'red-light': '#FF4D45',
          'orange': '#FF6600',
        },
        // SaaS 浅色主题
        'surface': {
          DEFAULT: '#FFFFFF',
          'secondary': '#F8FAFC',
          'tertiary': '#F1F5F9',
        },
        'border': {
          DEFAULT: '#E2E8F0',
          'light': '#F1F5F9',
        },
        'text': {
          'primary': '#0F172A',
          'secondary': '#475569',
          'tertiary': '#94A3B8',
        },
        // 状态色
        'status': {
          'success': '#10B981',
          'warning': '#F59E0B',
          'danger': '#EF4444',
          'info': '#3B82F6',
        }
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'panel': '0 4px 20px rgba(0, 0, 0, 0.08)',
      },
      fontFamily: {
        'sans': ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

