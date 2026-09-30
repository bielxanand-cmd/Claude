import { Download, Maximize2, Minus, Network, Pin, PinOff, Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/study/feedback'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useMindMaps, useSaveMindMap } from '@/data/queries'
import { buildMindMap, type MindMap, type MindMapSection } from '@/domain/mind-map'
import { useCanSaveFiles } from '@/lib/save-file'
import { downloadMindMap } from './export'
import { MindMapSvg, useMindMapLayout } from './mind-map-svg'

const ZOOMS = [0.3, 0.45, 0.6, 0.8, 1, 1.25, 1.5]

/** Onde o mapa pode ser fixado (página do assunto). */
export interface MindMapPinTarget {
  topicId: string
  subjectId: string
  subjectName: string
}

export function MindMapDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  sections,
  map: givenMap,
  pin,
  description = 'Gerado a partir do texto de todos os campos do resumo, incluindo alterações ainda não salvas.',
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle: string
  /** Campos do resumo (o mapa é montado ao abrir) */
  sections?: MindMapSection[]
  /** Ou um mapa pronto (ex.: o fixado na disciplina) */
  map?: MindMap
  pin?: MindMapPinTarget
  description?: string
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Em telas estreitas o mapa inteiro ficaria ilegível: abre com zoom e rolagem
  const initialZoom = (): number | 'fit' => (typeof window !== 'undefined' && window.innerWidth < 768 ? 0.45 : 'fit')
  const [zoom, setZoom] = useState<number | 'fit'>(initialZoom)
  const [exporting, setExporting] = useState(false)
  const canSave = useCanSaveFiles()
  const pinned = useMindMaps()
  const saveMindMap = useSaveMindMap()
  const current = pin ? (pinned.data ?? []).find((m) => m.topicId === pin.topicId) : undefined

  // Monta o mapa só quando a janela abre (usa o texto atual, mesmo sem salvar)
  const map = useMemo(
    () => (!open ? null : (givenMap ?? (sections ? buildMindMap({ title, subtitle, sections }) : null))),
    [open, givenMap, title, subtitle, sections],
  )

  const layout = useMindMapLayout(map)
  const naturalWidth = layout?.bounds.width ?? 0

  // Centraliza a rolagem no assunto (centro do mapa) ao abrir ou mudar o zoom
  useEffect(() => {
    if (!open) return
    const id = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (el) {
        el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
        el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
      }
    })
    return () => cancelAnimationFrame(id)
  }, [open, zoom, map])
  const step = (dir: 1 | -1) => {
    const now = zoom === 'fit' ? (svgRef.current ? svgRef.current.getBoundingClientRect().width / naturalWidth : 1) : zoom
    const next = dir > 0 ? ZOOMS.find((z) => z > now + 0.01) : [...ZOOMS].reverse().find((z) => z < now - 0.01)
    if (next) setZoom(next)
  }

  const download = async () => {
    setExporting(true)
    await downloadMindMap(svgRef.current, title)
    setExporting(false)
  }

  const togglePin = (on: boolean) => {
    if (!pin || !map) return
    saveMindMap.mutate(
      { topicId: pin.topicId, pinned: on ? { topicId: pin.topicId, subjectId: pin.subjectId, pinnedAt: new Date().toISOString(), map } : null },
      {
        onSuccess: () =>
          on
            ? toast.success(current ? 'Mapa atualizado na disciplina' : 'Mapa fixado na disciplina', { description: `Aparece em destaque em ${pin.subjectName}.` })
            : toast('Mapa removido da disciplina'),
        onError: () => toast.error('Não foi possível salvar. Tente de novo.'),
      },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setZoom(initialZoom())
      }}
    >
      <DialogContent className="flex h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] max-w-7xl flex-col gap-0 overflow-hidden p-0 sm:h-auto sm:max-h-[calc(100dvh-1.5rem)]">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:px-6 sm:pr-16 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 pr-10 sm:pr-0">
            <DialogTitle className="flex items-center gap-2">
              <Network className="size-5 text-primary" /> Mapa mental
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
          {layout && (
            <div className="-ml-2 flex flex-wrap items-center gap-1 sm:ml-0">
              <Button variant="ghost" size="icon-sm" onClick={() => step(-1)} aria-label="Diminuir zoom">
                <Minus />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setZoom('fit')} aria-label="Ajustar à tela" className="tabular-nums">
                {zoom === 'fit' ? <Maximize2 /> : `${Math.round(zoom * 100)}%`}
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => step(1)} aria-label="Aumentar zoom">
                <Plus />
              </Button>
              {canSave && (
                <Button variant="outline" size="sm" className="ml-1" onClick={download} loading={exporting}>
                  {!exporting && <Download />} Baixar JPEG
                </Button>
              )}
              {pin &&
                (current ? (
                  <>
                    <Button size="sm" className="ml-1" onClick={() => togglePin(true)} loading={saveMindMap.isPending}>
                      {!saveMindMap.isPending && <RefreshCw />} Atualizar na disciplina
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => togglePin(false)} disabled={saveMindMap.isPending}>
                      <PinOff /> Desafixar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="ml-1" onClick={() => togglePin(true)} loading={saveMindMap.isPending}>
                    {!saveMindMap.isPending && <Pin />} Fixar na disciplina
                  </Button>
                ))}
            </div>
          )}
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto bg-[#F4F4F6] p-3 sm:p-5">
          {!map || !layout ? (
            <EmptyState
              icon={Network}
              title="Escreva seu resumo primeiro"
              description="O mapa mental é montado a partir do que você escreve em Meu resumo, Pontos importantes e Observações. Use títulos e listas: cada título vira um cartão, e os itens viram os tópicos dele."
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
