import { ExternalLink, FileText } from 'lucide-react'
import { contestLabel, contestLocation } from '@/domain/labels'
import type { Contest } from '@/domain/types'
import { cn } from '@/lib/utils'

const ORIGIN_LABEL: Record<Contest['origin'], string> = {
  demo: 'Demonstrativo',
  curated: 'Base oficial',
  import: 'Importado',
  pdf: 'PDF',
  api: 'API',
  manual: 'Manual',
}

/** Lista compacta de editais-fonte (referência obrigatória de onde veio cada conteúdo). */
export function SourceChips({ contests, className, max = 4 }: { contests: Contest[]; className?: string; max?: number }) {
  const shown = contests.slice(0, max)
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {shown.map((c) => (
        <span
          key={c.id}
          title={`${c.name} — ${c.organization}${c.origin === 'demo' ? ' (dados demonstrativos)' : ''}`}
          className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted"
        >
          <FileText className="size-3" aria-hidden />
          {contestLabel(c)}
        </span>
      ))}
      {contests.length > max && <span className="text-xs text-muted">+{contests.length - max}</span>}
    </div>
  )
}

export function ContestRow({ contest, highlight }: { contest: Contest; highlight?: boolean }) {
  return (
    <li className={cn('flex items-center gap-3 rounded-xl px-3 py-3', highlight && 'bg-primary-tint/60')}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/[0.05] text-muted">
        <FileText className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {contest.organizationShort} {contest.year && <span className="font-medium text-muted">· {contest.year}</span>}
        </p>
        <p className="truncate text-xs text-muted">
          {contest.organization} · {contestLocation(contest)}
          {contest.examBoard && <> · {contest.examBoard}</>}
        </p>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
          contest.origin === 'demo' ? 'bg-warning-tint text-[#b45309] dark:text-warning' : 'bg-success-tint text-success-strong',
        )}
      >
        {ORIGIN_LABEL[contest.origin]}
      </span>
      {contest.noticeUrl && (
        <a href={contest.noticeUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-primary" aria-label="Abrir edital">
          <ExternalLink className="size-4" />
        </a>
      )}
    </li>
  )
}
