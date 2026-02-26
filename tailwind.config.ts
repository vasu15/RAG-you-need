import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      keyframes: {
        typingBounce: {
          '0%, 70%, 100%': { transform: 'translateY(0)',    opacity: '0.35' },
          '35%':            { transform: 'translateY(-5px)', opacity: '1'    },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
      },
      animation: {
        typingBounce: 'typingBounce 1.2s ease-in-out infinite',
        fadeUp:       'fadeUp 0.2s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
