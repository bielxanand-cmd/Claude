import { Check, Circle, CircleDot } from 'lucide-react'
import type { TopicStatus } from '@/domain/types'
import { cn } from '@/lib/utils'

export const STATUS_META: Record<TopicStatus, { label: string; short: string; icon: typeof Check; badge: string; dot: string }> = {
  not_started: {
    label: 'Não iniciado',
    short: 'Não iniciado',
    icon: Circle,
    badge: 'bg-foreground/[0.06] text-muted',
    dot: 'border-2 border-border-strong bg-transparent',
  },
  in_progress: {
    label: 'Em andamento',
    short: 'Estudando',
    icon: CircleDot,
    badge: 'bg-primary-tint text-primary-strong dark:text-primary-soft',
    dot: 'bg-primary ring-4 ring-primary/15',
  },
  completed: {
    label: 'Concluído',
    short: 'Concluído',
    icon: Check,
    badge: 'bg-success-tint text-success-strong',
    dot: 'bg-success',
  },
}

export const STATUS_ORDER: TopicStatus[] = ['not_started', 'in_progress', 'completed']

export function StatusBadge({ status, className }: { status: TopicStatus; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold', meta.badge, className)}>
      <Icon className="size-3" strokeWidth={3} aria-hidden />
      {meta.label}
    </span>
  )
}

/** Controle segmentado para alterar o status de um assunto. */
export function StatusControl({
  value,
  onChange,
  className,
}: {
  value: TopicStatus
  onChange: (status: TopicStatus) => void
  className?: string
}) {
  return (
    <div role="radiogroup" aria-label="Status do assunto" className={cn('inline-flex rounded-xl bg-foreground/[0.05] p-1', className)}>
      {STATUS_ORDER.map((status) => {
        const meta = STATUS_META[status]
        const active = value === status
        const Icon = meta.icon
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(status)}
            className={cn(
              'inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[13px] font-semibold text-muted transition-all sm:px-3',
              'hover:text-foreground',
              active && status === 'not_started' && 'bg-surface text-foreground shadow-soft',
              active && status === 'in_progress' && 'bg-primary text-white shadow-soft hover:text-white',
              active && status === 'completed' && 'bg-success text-white shadow-soft hover:text-white',
            )}
          >
            <Icon className="size-3.5" strokeWidth={2.5} aria-hidden />
            {meta.short}
          </button>
        )
      })}
    </div>
  )
}

/** Botão circular que alterna concluído/não concluído (usado nas listas). */
export function StatusToggle({ status, onToggle, label }: { status: TopicStatus; onToggle: (target: HTMLButtonElement) => void; label: string }) {
  const completed = status === 'completed'
  return (
    <button
      type="button"
      onClick={(e) => onToggle(e.currentTarget)}
      aria-pressed={completed}
      aria-label={completed ? `Desmarcar "${label}" como concluído` : `Marcar "${label}" como concluído`}
      className={cn(
        'group/toggle grid size-7 shrink-0 place-items-center rounded-full transition-all duration-200',
        completed
          ? 'bg-success text-white animate-pop'
          : status === 'in_progress'
            ? 'border-2 border-primary bg-primary-tint text-primary hover:bg-primary hover:text-white'
            : 'border-2 border-border-strong text-transparent hover:border-success hover:text-success',
      )}
    >
      <Check className="size-4" strokeWidth={3} />
    </button>
  )
}
