import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { getFontEmbedCSS, toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { SLIDE_H, SLIDE_W, SlideModeContext } from '@/components/slides/primitives'
import type { DeckSlide } from '@/components/slides/slides'
import type { Proposal } from './types'
import { slugify } from './utils'

const PIXEL_RATIO = 2.5 // 3200×1800 por página — nítido em tela cheia e impressão

async function waitForImages(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll('img'))
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.complete)
        await new Promise((r) => {
          img.addEventListener('load', r, { once: true })
          img.addEventListener('error', r, { once: true })
        })
      try {
        await img.decode()
      } catch {
        /* imagem inválida: segue sem ela */
      }
    }),
  )
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

/**
 * Renderiza cada slide em um palco 1280×720 fora da tela e monta um PDF 16:9
 * página a página. Links (ROI, contatos) continuam clicáveis no PDF.
 */
export async function exportDeckToPdf(deck: DeckSlide[], opts: { title: string; onProgress?: (done: number, total: number) => void }) {
  const stage = document.createElement('div')
  stage.setAttribute('aria-hidden', 'true')
  Object.assign(stage.style, { position: 'fixed', left: '-100000px', top: '0', width: `${SLIDE_W}px`, height: `${SLIDE_H}px`, pointerEvents: 'none' })
  document.body.appendChild(stage)
  const root = createRoot(stage)

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [SLIDE_W, SLIDE_H], hotfixes: ['px_scaling'], compress: true })
  pdf.setProperties({ title: opts.title, author: 'Cibus', creator: 'Cibus Propostas', subject: 'Proposta comercial' })

  try {
    await document.fonts.ready
    let fontEmbedCSS: string | undefined
    for (let i = 0; i < deck.length; i++) {
      flushSync(() => root.render(<SlideModeContext.Provider value="export">{deck[i]!.element}</SlideModeContext.Provider>))
      const node = stage.firstElementChild as HTMLElement
      await waitForImages(node)
      await nextFrame()

      fontEmbedCSS ??= await getFontEmbedCSS(node)
      const opt = { width: SLIDE_W, height: SLIDE_H, pixelRatio: PIXEL_RATIO, quality: 0.95, cacheBust: false, fontEmbedCSS }
      if (i === 0) await toJpeg(node, opt) // aquecimento: garante imagens decodificadas no primeiro render
      const img = await toJpeg(node, opt)

      if (i > 0) pdf.addPage([SLIDE_W, SLIDE_H], 'landscape')
      pdf.addImage(img, 'JPEG', 0, 0, SLIDE_W, SLIDE_H, undefined, 'FAST')

      const base = node.getBoundingClientRect()
      node.querySelectorAll<HTMLElement>('[data-pdf-link]').forEach((a) => {
        const r = a.getBoundingClientRect()
        pdf.link(r.left - base.left, r.top - base.top, r.width, r.height, { url: a.dataset.pdfLink! })
      })
      opts.onProgress?.(i + 1, deck.length)
    }
  } finally {
    root.unmount()
    stage.remove()
  }
  return pdf.output('blob')
}

export function pdfFileName(p: Proposal) {
  const who = p.client.company || p.client.contactName || 'cliente'
  return `Proposta Cibus - ${who} - ${p.meta.date || ''}`.trim().replace(/[\\/:*?"<>|]/g, '') + '.pdf'
}

type ClaudeDownloads = { save: (r: { filename: string; data: Blob }) => Promise<{ status: string }> }
type ClaudeHost = { use?: (name: string) => Promise<unknown> }

/**
 * Entrega o arquivo ao usuário. Dentro do visualizador de Artifacts do claude.ai
 * o download direto é bloqueado, então usamos a capability `downloads`.
 * Retorna false se o usuário recusou.
 */
export async function downloadBlob(blob: Blob, name: string): Promise<boolean> {
  const filename = name || `${slugify('proposta')}.pdf`
  const host = (window as unknown as { claude?: ClaudeHost }).claude
  if (host?.use) {
    const downloads = (await host.use('downloads').catch(() => null)) as ClaudeDownloads | null
    if (downloads) {
      try {
        await downloads.save({ filename, data: blob })
        return true
      } catch (e) {
        if ((e as { code?: string }).code === 'declined') return false
        throw new Error((e as { message?: string }).message || 'Download indisponível')
      }
    }
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return true
}
