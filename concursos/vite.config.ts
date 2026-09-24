/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // Pré-otimiza o pdf.js: sem isso, o primeiro envio de PDF no `npm run dev`
  // dispara uma otimização tardia e o Vite recarrega a página.
  optimizeDeps: { include: ['pdfjs-dist/legacy/build/pdf.mjs', 'pdfjs-dist/legacy/build/pdf.worker.mjs'] },
  // `--mode artifact`: bundle único e caminhos relativos (versão de demonstração publicada)
  ...(mode === 'artifact' && {
    base: './',
    build: { outDir: 'dist-artifact', rolldownOptions: { output: { codeSplitting: false } } },
  }),
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'supabase/**/*.test.ts'],
  },
}))
