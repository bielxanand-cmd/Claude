import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import type { Progress } from '@/domain/progress'
import type { PlanSubject } from '@/domain/types'
import { percent } from '@/lib/text'
import { cn } from '@/lib/utils'
import { IconTile } from './icon-registry'

export function SubjectCard({ subject, progress }: { subject: PlanSubject; progress: Progress }) {
  const done = progress.total > 0 && progress.completed === progress.total
  return (
    <Link to={`/disciplina/${subject.subject.id}`} className="group block rounded-2xl focus-visible:outline-offset-4">
      <Card interactive className="flex h-full flex-col p-5">
        <div className="flex items-start gap-3">
          <IconTile icon={subject.subject.icon} className={cn(done && 'bg-success-tint text-success-strong')} />
          <div className="min-w-0 flex-1">
            <h3 className="font-bold leading-snug tracking-tight">{subject.subject.name}</h3>
            <p className="mt-0.5 text-[13px] text-muted">
              {subject.topics.length} assuntos
              {subject.weight != null && <> · peso {subject.weight.toLocaleString('pt-BR')}</>}
            </p>
          </div>
          {done && <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Disciplina concluída" />}
        </div>

        <div className="mt-5 flex items-baseline justify-between">
          <span className="text-[13px] font-medium text-muted">
            {progress.completed}/{progress.total} concluídos
          </span>
          <span className={cn('text-sm font-bold tabular-nums', done ? 'text-success-strong' : 'text-foreground')}>{percent(progress.ratio)}</span>
        </div>
        <ProgressBar value={progress.ratio} className="mt-2" label={`Progresso em ${subject.subject.name}`} />

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-all group-hover:gap-2.5 dark:text-primary-soft">
          {progress.completed === 0 ? 'Começar disciplina' : done ? 'Revisar disciplina' : 'Estudar disciplina'}
          <ArrowRight className="size-4" aria-hidden />
        </span>
      </Card>
    </Link>
  )
}
