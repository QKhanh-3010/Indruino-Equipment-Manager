/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Manrope tao dang chu hien dai, Be Vietnam Pro giu tieng Viet ro rang.
        sans: ['"Be Vietnam Pro"', '"Segoe UI Variable"', '"Segoe UI"', 'sans-serif'],
        display: ['"Manrope"', '"Be Vietnam Pro"', '"Segoe UI Variable"', 'sans-serif'],
      },
      colors: {
        // Xanh navy thuong hieu Indruino (mau chu dao)
        navy: {
          50: '#f3f7fc',
          100: '#e4edf7',
          200: '#c4d8ec',
          300: '#94b8da',
          400: '#5d90c0',
          500: '#3a71a8',
          600: '#2a5789',
          700: '#234670',
          800: '#1d3a5c',
          900: '#132a44',
          950: '#0b1c30',
        },
        // Xam trung tinh cho nen, vien, chu phu
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e6ebf1',
          300: '#cfd8e3',
          400: '#93a1b3',
          500: '#647386',
          600: '#4a5768',
          700: '#364252',
          800: '#212c3a',
          900: '#111a26',
        },
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        // Bong nhe cho bang/hang du lieu
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        // Bong cho the noi dung
        card: '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 8px 24px -14px rgba(15, 23, 42, 0.28)',
        // Bong cho dropdown, popover, modal
        pop: '0 10px 30px -12px rgba(11, 28, 48, 0.28), 0 4px 12px -6px rgba(11, 28, 48, 0.16)',
        // Vien sang cho trang thai focus
        inset: 'inset 0 1px 2px 0 rgba(15, 23, 42, 0.04)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-scale': {
          from: { opacity: '0', transform: 'translateY(-4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'fade-in-scale': 'fade-in-scale 140ms ease-out',
        'slide-in-right': 'slide-in-right 180ms ease-out',
        shimmer: 'shimmer 1.6s infinite',
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
