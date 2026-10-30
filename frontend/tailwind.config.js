/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        ndot: ['"NDot57"', '"NDot55"', 'monospace'],
        ndot55: ['"NDot55"', 'monospace'],
        sans: ['"Space Grotesk"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        nothing: {
          bg: '#000000',
          panel: '#0c0c0e',
          surface: '#141417',
          surfaceLight: '#1e1e24',
          border: '#242429',
          borderLight: 'rgba(255, 255, 255, 0.12)',
          borderActive: '#ffffff',
          red: '#d73832',
          redBright: '#ff3126',
          redGlow: 'rgba(215, 56, 50, 0.45)',
          amber: '#f59e0b',
          text: '#ffffff',
          textMuted: '#888892',
          textDim: '#44444c',
        },
        palette: {
          coral: '#ec9665',
          peach: '#f4aa7f',
          espresso: '#523624',
          caramel: '#9c6c4c',
          sand: '#d8bca4',
          umber: '#5f493b',
          darkest: '#000000',
          dark: '#0c0c0e',
          surface: '#141417',
          card: 'rgba(12, 12, 14, 0.85)',
          cardHover: 'rgba(20, 20, 23, 0.95)',
          glass: 'rgba(12, 12, 14, 0.75)',
          glassBorder: 'rgba(255, 255, 255, 0.14)',
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },
    },
  },
  plugins: [],
}
