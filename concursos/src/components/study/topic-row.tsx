import { ArrowRight, NotebookPen, Sparkle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { PlanTopic, TopicStatus } from '@/domain/types'
import { cn } from '@/lib/utils'
import { StatusBadge, StatusToggle } from './status'

export function FrequencyPill({ frequency, total }: { frequency: number; total: number }) {
  const count = Math.round(frequency * total)
  const hot = frequency >= 0.8 && total > 1
  return (
    <span
      title={`Presente em ${count} de ${total} editais analisados`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        hot ? 'bg-primary-tint text-primary-strong dark:text-primary-soft' : 'bg-foreground/[0.05] text-muted',
      )}
    >
      {hot && <Sparkle className="size-3" aria-hidden />}
      {count}/{total} editais
    </span>
  )
}

export function TopicRow({
  planTopic,
  status,
  hasSummary,
  totalContests,
  onStatusChange,
}: {
  planTopic: PlanTopic
  status: TopicStatus
  hasSummary: boolean
  totalContests: number
  onStatusChange: (status: TopicStatus, origin: Element | null) => void
}) {
  const { topic } = planTopic
  const href = `/assunto/${topic.id}`

  return (
    <li
      className={cn(
        'group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-colors sm:gap-4 sm:px-4',
        'hover:border-border hover:bg-surface hover:shadow-soft',
      )}
    >
      <StatusToggle
        status={status}
        label={topic.name}
        onToggle={(target) => onStatusChange(status === 'completed' ? 'not_started' : 'completed', target)}
      />

      <Link to={href} className="min-w-0 flex-1 focus-visible:outline-offset-4">
        <p className={cn('font-semibold leading-snug', status === 'completed' && 'text-muted')}>{topic.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={status} />
          <FrequencyPill frequency={planTopic.frequency} total={totalContests} />
          {hasSummary && (
            <span className="inline-flex items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-semibold text-muted">
              <NotebookPen className="size-3" aria-hidden /> Resumo
            </span>
          )}
        </div>
      </Link>

      <Button asChild variant={status === 'completed' ? 'outline' : status === 'in_progress' ? 'primary' : 'secondary'} size="sm" className="hidden sm:inline-flex">
        <Link to={href}>
          {status === 'completed' ? (hasSummary ? 'Abrir resumo' : 'Revisar') : status === 'in_progress' ? 'Continuar' : 'Estudar'}
          <ArrowRight />
        </Link>
      </Button>
      <Link to={href} className="grid size-8 place-items-center rounded-lg text-subtle sm:hidden" aria-label={`Abrir ${topic.name}`}>
        <ArrowRight className="size-4" />
      </Link>
    </li>
  )
}
