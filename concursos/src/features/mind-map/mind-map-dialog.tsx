import { Download, Maximize2, Minus, Network, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/study/feedback'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { buildMindMap, type MindMapSection } from '@/domain/mind-map'
import { slugify } from '@/lib/text'
import { MindMapSvg, useMindMapLayout } from './mind-map-svg'

/** A versão de demonstração publicada não pode oferecer downloads. */
const CAN_DOWNLOAD = import.meta.env.VITE_MEMORY_ROUTER !== 'true'
const ZOOMS = [0.4, 0.6, 0.8, 1, 1.25, 1.5]

async function svgToPng(svg: SVGSVGElement, scale = 2): Promise<Blob> {
  const width = svg.viewBox.baseVal.width
  const height = svg.viewBox.baseVal.height
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
    ctx.scale(scale, scale)
    ctx.drawImage(img, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('png'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function MindMapDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  sections,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle: string
  sections: MindMapSection[]
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Em telas estreitas o mapa inteiro ficaria ilegível: abre com zoom e rolagem
  const initialZoom = (): number | 'fit' => (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.6 : 'fit')
  const [zoom, setZoom] = useState<number | 'fit'>(initialZoom)
  const [exporting, setExporting] = useState(false)

  // Monta o mapa só quando a janela abre (usa o texto atual, mesmo sem salvar)
  const map = useMemo(() => (open ? buildMindMap({ title, subtitle, sections }) : null), [open, title, subtitle, sections])

  const layout = useMindMapLayout(map)
  const naturalWidth = layout?.bounds.width ?? 0

  // Centraliza a rolagem no assunto (centro do mapa) ao abrir ou mudar o zoom
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    })
    return () => cancelAnimationFrame(id)
  }, [open, zoom, map])
  const step = (dir: 1 | -1) => {
    const current = zoom === 'fit' ? (svgRef.current ? svgRef.current.getBoundingClientRect().width / naturalWidth : 1) : zoom
    const next = dir > 0 ? ZOOMS.find((z) => z > current + 0.01) : [...ZOOMS].reverse().find((z) => z < current - 0.01)
    if (next) setZoom(next)
  }

  const download = async () => {
    if (!svgRef.current) return
    setExporting(true)
    try {
      const blob = await svgToPng(svgRef.current)
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `mapa-mental-${slugify(title)}.png`
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 1000)
      toast.success('Imagem baixada')
    } catch {
      toast.error('Não foi possível gerar a imagem.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setZoom(initialZoom())
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-6xl flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-1.5rem)]">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:px-6 sm:pr-16">
          <div className="min-w-0 flex-1 pr-10 sm:pr-0">
            <DialogTitle className="flex items-center gap-2">
              <Network className="size-5 text-primary" /> Mapa mental
            </DialogTitle>
            <DialogDescription>Gerado a partir do texto de todos os campos do resumo, incluindo alterações ainda não salvas.</DialogDescription>
          </div>
          {layout && (
            <div className="-ml-2 flex items-center gap-1 sm:ml-0">
              <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="Diminuir zoom">
                <Minus />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setZoom('fit')} aria-label="Ajustar à tela" className="tabular-nums">
                {zoom === 'fit' ? <Maximize2 /> : `${Math.round(zoom * 100)}%`}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="Aumentar zoom">
                <Plus />
              </Button>
              {CAN_DOWNLOAD && (
                <Button variant="outline" size="sm" className="ml-2" onClick={download} loading={exporting}>
                  {!exporting && <Download />} Baixar PNG
                </Button>
              )}
            </div>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-[#F4F4F6] p-3 sm:p-5">
          {!map || !layout ? (
            <EmptyState
              icon={Network}
              title="Escreva seu resumo primeiro"
              description="O mapa mental é montado a partir do que você escreve em Meu resumo, Pontos importantes, Pegadinhas e Observações. Use listas e títulos para um mapa mais organizado."
              className="bg-surface"
            />
          ) : (
            <MindMapSvg
              ref={svgRef}
              map={map}
              layout={layout}
              className="mx-auto block rounded-xl shadow-soft"
              style={
                zoom === 'fit'
                  ? { width: '100%', height: 'auto', maxHeight: 'calc(100dvh - 11rem)' }
                  : { width: naturalWidth * zoom, height: 'auto', maxWidth: 'none' }
              }
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
