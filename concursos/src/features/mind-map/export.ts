import { toast } from 'sonner'
import { saveFile } from '@/lib/save-file'
import { slugify } from '@/lib/text'

/** Maior imagem gerada (em pixels) — acima disso alguns navegadores falham. */
const MAX_PIXELS = 16_000_000

/** Converte o SVG do mapa em imagem (JPEG com fundo branco, em alta resolução). */
export async function svgToJpeg(svg: SVGSVGElement, quality = 0.92): Promise<Blob> {
  const width = svg.viewBox.baseVal.width
  const height = svg.viewBox.baseVal.height
  const scale = Math.min(2, Math.sqrt(MAX_PIXELS / (width * height)))
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  clone.removeAttribute('style')
  clone.removeAttribute('class')
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('jpeg'))), 'image/jpeg', quality))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Baixa o mapa como JPEG, com os avisos de sucesso/erro. */
export async function downloadMindMap(svg: SVGSVGElement | null, title: string): Promise<void> {
  if (!svg) return
  try {
    const blob = await svgToJpeg(svg)
    const result = await saveFile(`mapa-mental-${slugify(title)}.jpg`, blob)
    if (result === 'saved') toast.success('Imagem JPEG baixada')
    else if (result === 'failed') toast.error('Não foi possível baixar a imagem nesta página.')
  } catch {
    toast.error('Não foi possível gerar a imagem.')
  }
}
