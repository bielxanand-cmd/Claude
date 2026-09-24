import { ArrowRight, Check, History, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { useForgetSelection, usePlan, useRecentSelections, useSelection, useSetSelection, useUserTopics } from '@/data/queries'
import { positionTitle } from '@/domain/labels'
import { planProgress, toStatusMap } from '@/domain/progress'
import type { UserSelection } from '@/domain/types'
import { percent } from '@/lib/text'
import { cn, formatRelative } from '@/lib/utils'
import { IconTile } from './icon-registry'

function ContestItem({ selection, active, onOpen }: { selection: UserSelection; active: boolean; onOpen: () => void }) {
  const plan = usePlan(selection.positionId)
  const userTopics = useUserTopics()
  const forget = useForgetSelection()

  if (plan.isLoading) return <Skeleton className="h-[76px]" />
  if (!plan.data) return null // cargo removido do catálogo

  const progress = planProgress(plan.data, toStatusMap(userTopics.data ?? []))
  const topicCount = progress.total
  return (
    <li className="group relative">
      <button
        type="button"
        onClick={onOpen}
        disabled={active}
        className={cn(
          'flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition sm:gap-4 sm:p-4',
          active ? 'border-primary/50 bg-primary-tint/50' : 'border-border bg-surface hover:border-primary/40 hover:shadow-lift',
        )}
      >
        <IconTile icon={plan.data.career.icon} />
        <span className="min-w-0 flex-1 pr-6">
          <span className="flex items-center gap-2">
            <span className="truncate font-bold">{positionTitle(plan.data, selection)}</span>
            {active && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                <Check className="size-3" /> Atual
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            {topicCount} assuntos · {progress.completed} concluídos · aberto {formatRelative(selection.createdAt)}
          </span>
          <span className="mt-2 flex items-center gap-2">
            <ProgressBar value={progress.ratio} size="sm" className="max-w-56" />
            <span className="text-xs font-bold tabular-nums">{percent(progress.ratio)}</span>
          </span>
        </span>
        {!active && <ArrowRight className="size-4 shrink-0 text-subtle transition group-hover:text-primary" aria-hidden />}
      </button>
      {!active && (
        <button
          type="button"
          onClick={() => forget.mutate(selection.positionId, { onSuccess: () => toast('Removido de Meus concursos', { description: 'Seu progresso nos assuntos continua salvo.' }) })}
          aria-label={`Remover ${plan.data.position.name} de Meus concursos`}
          title="Remover da lista"
          className="absolute right-2 top-2 grid size-7 place-items-center rounded-lg text-subtle opacity-100 transition hover:bg-foreground/[0.06] hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  )
}

/**
 * Concursos que o usuário já abriu, com o progresso de cada um. Um clique
 * volta para o concurso — sem refazer o cadastro nem reimportar editais.
 */
export function MyContests({ onSwitched, title = 'Meus concursos', hideWhenEmpty = false }: { onSwitched?: () => void; title?: string; hideWhenEmpty?: boolean }) {
  const recent = useRecentSelections()
  const selection = useSelection()
  const setSelection = useSetSelection()
  const navigate = useNavigate()

  const items = recent.data ?? []
  if (recent.isLoading) return <Skeleton className="h-24" />
  if (items.length === 0) {
    if (hideWhenEmpty) return null
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
        <History className="size-4" aria-hidden /> Os concursos que você abrir aparecem aqui.
      </p>
    )
  }

  const open = (s: UserSelection) =>
    setSelection.mutate(
      { positionId: s.positionId, sphere: s.sphere, state: s.state },
      {
        onSuccess: () => {
          onSwitched?.()
          navigate('/dashboard')
        },
        onError: () => toast.error('Não foi possível trocar de concurso.'),
      },
    )

  return (
    <section aria-label={title}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
        <History className="size-4 text-primary dark:text-primary-soft" aria-hidden /> {title}
      </h2>
      <ul className="space-y-2">
        {items.map((s) => (
          <ContestItem key={s.positionId} selection={s} active={selection.data?.positionId === s.positionId} onOpen={() => open(s)} />
        ))}
      </ul>
    </section>
  )
}
