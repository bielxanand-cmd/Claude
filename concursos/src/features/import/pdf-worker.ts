/**
 * Entrada do Web Worker do pdf.js: instala os polyfills no contexto do
 * worker (que não herda os da página) antes de carregar o pdf.js.
 */
import './pdf-polyfills-install'
import 'pdfjs-dist/legacy/build/pdf.worker.mjs'
