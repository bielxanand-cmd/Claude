import { Download, ExternalLink, Maximize2, Network, PinOff } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useMindMaps, useSaveMindMap } from '@/data/queries'
import type { PinnedMindMap } from '@/domain/mind-map'
import type { PlanSubject } from '@/domain/types'
import { useCanSaveFiles } from '@/lib/save-file'
import { formatRelative } from '@/lib/utils'
import { downloadMindMap } from './export'
import { MindMapDialog } from './mind-map-dialog'
import { MindMapSvg, useMindMapLayout } from './mind-map-svg'

/** Mapas mentais fixados nos assuntos da disciplina, em destaque no topo da página. */
export function SubjectMindMaps({ subject }: { subject: PlanSubject }) {
  const mindMaps = useMindMaps()
  const topicNames = useMemo(() => new Map(subject.topics.map((t) => [t.topic.id, t.topic.name])), [subject])
  const pinned = useMemo(
    () => (mindMaps.data ?? []).filter((m) => topicNames.has(m.topicId)).sort((a, b) => b.pinnedAt.localeCompare(a.pinnedAt)),
    [mindMaps.data, topicNames],
  )
  if (pinned.length === 0) return null

  return (
    <section className="mb-6" aria-label="Mapas mentais em destaque">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold tracking-tight">
        <Network className="size-5 text-primary dark:text-primary-soft" aria-hidden /> Mapas mentais em destaque
      </h2>
      <div className={pinned.length > 1 ? 'grid grid-cols-1 gap-4 xl:grid-cols-2' : 'grid grid-cols-1'}>
        {pinned.map((m) => (
          <PinnedCard key={m.topicId} pinned={m} topicName={topicNames.get(m.topicId)!} large={pinned.length === 1} />
        ))}
      </div>
    </section>
  )
}

function PinnedCard({ pinned, topicName, large }: { pinned: PinnedMindMap; topicName: string; large: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const layout = useMindMapLayout(pinned.map)
  const [open, setOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const canSave = useCanSaveFiles()
  const saveMindMap = useSaveMindMap()
  if (!layout) return null

  const unpin = () =>
    saveMindMap.mutate(
      { topicId: pinned.topicId, pinned: null },
      { onSuccess: () => toast('Mapa removido da disciplina'), onError: () => toast.error('Não foi possível remover.') },
    )

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full bg-[#F4F4F6] p-3 sm:p-4"
        aria-label={`Ampliar mapa mental de ${topicName}`}
      >
        <MindMapSvg
          ref={svgRef}
          map={pinned.map}
          layout={layout}
          className="mx-auto block h-auto w-full rounded-xl shadow-soft"
          style={{ maxHeight: large ? '70dvh' : '360px' }}
        />
        <span className="absolute right-5 bottom-5 flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          <Maximize2 className="size-3.5" aria-hidden /> Ampliar
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
        <div className="w-full min-w-0 sm:w-auto sm:flex-1">
          <p className="text-sm font-bold sm:truncate">{topicName}</p>
          <p className="text-xs text-muted">Fixado {formatRelative(pinned.pinnedAt)}</p>
        </div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 sm:ml-0">
          <Link to={`/assunto/${pinned.topicId}`}>
            <ExternalLink /> Abrir assunto
          </Link>
        </Button>
        {canSave && (
          <Button
            variant="outline"
            size="sm"
            loading={exporting}
            onClick={async () => {
              setExporting(true)
              await downloadMindMap(svgRef.current, topicName)
              setExporting(false)
            }}
          >
            {!exporting && <Download />} JPEG
          </Button>
        )}
        <Button variant="ghost" size="icon-sm" onClick={unpin} aria-label={`Desafixar mapa de ${topicName}`} title="Desafixar da disciplina">
          <PinOff />
        </Button>
      </div>
      <MindMapDialog
        open={open}
        onOpenChange={setOpen}
        title={topicName}
        subtitle={pinned.map.subtitle}
        map={pinned.map}
        description="Mapa fixado nesta disciplina. Para mudar, abra o assunto, edite o resumo e use “Atualizar na disciplina”."
      />
    </Card>
  )
}
