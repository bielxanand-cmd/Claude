import { Link } from 'react-router-dom'
import type { StatusMap } from '@/domain/progress'
import { subjectProgress } from '@/domain/progress'
import type { PlanSubject } from '@/domain/types'
import { percent } from '@/lib/text'
import { cn } from '@/lib/utils'

/**
 * Gráfico de barras horizontais do progresso por disciplina. Barras
 * horizontais mantêm os nomes legíveis em qualquer largura (inclusive celular).
 */
export function SubjectBars({ subjects, statuses }: { subjects: PlanSubject[]; statuses: StatusMap }) {
  const rows = subjects.map((s) => ({ subject: s, progress: subjectProgress(s, statuses) }))
  return (
    <ul className="space-y-4" aria-label="Progresso por disciplina">
      {rows.map(({ subject, progress }) => {
        const done = progress.ratio >= 1
        return (
          <li key={subject.subject.id}>
            <Link to={`/disciplina/${subject.subject.id}`} className="group block">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-semibold transition group-hover:text-primary">{subject.subject.name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className={cn('font-bold', done && 'text-success-strong')}>{percent(progress.ratio)}</span>
                  <span className="ml-2 text-xs text-muted">
                    {progress.completed}/{progress.total}
                  </span>
                </span>
              </div>
              <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-foreground/[0.06]" role="img" aria-label={`${subject.subject.name}: ${percent(progress.ratio)} concluído, ${progress.inProgress} em andamento`}>
                <div className={cn('h-full transition-[width] duration-700', done ? 'bg-success' : 'bg-primary')} style={{ width: `${(progress.completed / Math.max(1, progress.total)) * 100}%` }} />
                <div className="h-full bg-primary-soft/45 transition-[width] duration-700" style={{ width: `${(progress.inProgress / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
