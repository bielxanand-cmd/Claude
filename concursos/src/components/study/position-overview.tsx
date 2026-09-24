import { BookOpen, CheckCircle2, Circle, Layers } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress-ring'
import type { Progress } from '@/domain/progress'
import { percent } from '@/lib/text'

/** Bloco "Seu progresso" com indicador circular e contadores do cargo. */
export function PositionOverview({ progress, subjectCount }: { progress: Progress; subjectCount: number }) {
  const stats = [
    { label: 'disciplinas', value: subjectCount, icon: Layers },
    { label: 'assuntos', value: progress.total, icon: BookOpen },
    { label: 'estudados', value: progress.completed, icon: CheckCircle2 },
    { label: 'pendentes', value: progress.pending, icon: Circle },
  ]
  return (
    <Card className="flex flex-col items-center gap-8 p-6 sm:flex-row sm:p-8">
      <ProgressRing value={progress.ratio} size={168} stroke={14}>
        <div>
          <p className="text-4xl font-extrabold tracking-tight tabular-nums">{percent(progress.ratio)}</p>
          <p className="text-xs font-semibold text-muted">concluído</p>
        </div>
      </ProgressRing>
      <div className="w-full flex-1">
        <h2 className="text-center text-lg font-bold tracking-tight sm:text-left">Seu progresso</h2>
        <dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-foreground/[0.03] p-4">
              <Icon className="size-4 text-primary dark:text-primary-soft" aria-hidden />
              <dd className="mt-2 text-2xl font-extrabold tabular-nums">{value}</dd>
              <dt className="text-[13px] text-muted">{label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}
