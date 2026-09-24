import animate from 'tailwindcss-animate'
import containerQueries from '@tailwindcss/container-queries'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1400px' } },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          soft: 'rgb(var(--brand) / 0.08)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          black: '#111111',
        },
        mist: '#F5F7FA',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'rgb(var(--brand) / <alpha-value>)',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'rgb(var(--brand) / <alpha-value>)', foreground: '#FFFFFF' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: '#FFFFFF' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: '#FFFFFF', foreground: 'hsl(var(--foreground))' },
        card: { DEFAULT: '#FFFFFF', foreground: 'hsl(var(--foreground))' },
      },
      borderRadius: { lg: '14px', md: '10px', sm: '8px' },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,.04), 0 8px 24px -8px rgba(16,24,40,.10)',
        lift: '0 2px 4px rgba(16,24,40,.04), 0 24px 48px -16px rgba(16,24,40,.22)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both' },
    },
  },
  plugins: [animate, containerQueries],
}
