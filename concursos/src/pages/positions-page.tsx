import { ArrowRight, FileText, Search, SearchX } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { PageHeader } from '@/components/study/page-header'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useCareers, usePositions, useSelection } from '@/data/queries'
import type { Sphere } from '@/domain/types'
import { SPHERE_LABEL } from '@/lib/states'
import { normalize, pluralize } from '@/lib/text'
import { cn } from '@/lib/utils'

const selectClass = 'h-11 rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary'

export function PositionsPage() {
  const [params, setParams] = useSearchParams()
  const careerId = params.get('carreira') ?? ''
  const sphere = (params.get('esfera') ?? '') as Sphere | ''
  const query = params.get('q') ?? ''
  const careers = useCareers()
  const positions = usePositions({ careerId: careerId || undefined, sphere: sphere || undefined })
  const selection = useSelection()

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const list = useMemo(
    () => (positions.data ?? []).filter((p) => normalize(`${p.position.name} ${p.career.name} ${p.position.description}`).includes(normalize(query))),
    [positions.data, query],
  )

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Explorar" title="Cargos" description="Pesquise cargos e veja o plano consolidado a partir dos editais anteriores." />

      <div className="mb-6 flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input value={query} onChange={(e) => update('q', e.target.value)} placeholder="Pesquisar cargo…" aria-label="Pesquisar cargo" className="pl-10" />
        </div>
        <select value={careerId} onChange={(e) => update('carreira', e.target.value)} aria-label="Carreira" className={selectClass}>
          <option value="">Todas as carreiras</option>
          {careers.data?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select value={sphere} onChange={(e) => update('esfera', e.target.value)} aria-label="Esfera" className={selectClass}>
          <option value="">Todas as esferas</option>
          {(Object.keys(SPHERE_LABEL) as Sphere[]).map((s) => (
            <option key={s} value={s}>
              {SPHERE_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {positions.error ? (
        <ErrorState error={positions.error} onRetry={() => positions.refetch()} />
      ) : positions.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={SearchX} title="Nenhum cargo encontrado" description="Ajuste os filtros ou cadastre seu cargo no onboarding." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map(({ position, career, contests }) => {
            const active = selection.data?.positionId === position.id
            return (
              <Link key={position.id} to={`/cargo/${position.id}`} className="group block rounded-2xl">
                <Card interactive className={cn('flex h-full items-center gap-4 p-5', active && 'border-primary/50')}>
                  <IconTile icon={career.icon} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold">{position.name}</h2>
                      {active && <span className="rounded-full bg-primary-tint px-2 py-0.5 text-[11px] font-semibold text-primary-strong dark:text-primary-soft">Atual</span>}
                    </div>
                    <p className="text-sm text-muted">
                      {career.name} · {position.spheres.map((s) => SPHERE_LABEL[s]).join(', ')}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted">
                      <FileText className="size-3.5" aria-hidden />
                      {contests.length ? pluralize(contests.length, 'edital', 'editais') : 'Sem editais'}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-subtle transition group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden />
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
