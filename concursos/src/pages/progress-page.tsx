import { CheckCircle2, CircleDot, Circle, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { SubjectBars } from '@/components/charts/subject-bars'
import { EmptyPlan } from '@/components/study/empty-plan'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { PageHeader } from '@/components/study/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProgressRing } from '@/components/ui/progress-ring'
import { useStudy } from '@/data/queries'
import { planProgress } from '@/domain/progress'
import { percent } from '@/lib/text'
import { formatRelative } from '@/lib/utils'

export function ProgressPage() {
  const { plan, statuses, userTopics, topicIndex, isLoading, error, refetch } = useStudy()

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !plan) return <PageSkeleton />

  const progress = planProgress(plan, statuses)
  const recent = userTopics
    .filter((t) => t.status === 'completed' && t.completedAt && topicIndex.has(t.topicId))
    .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!))
    .slice(0, 8)

  const legend = [
    { label: 'Concluídos', value: progress.completed, icon: CheckCircle2, className: 'text-success' },
    { label: 'Em andamento', value: progress.inProgress, icon: CircleDot, className: 'text-primary dark:text-primary-soft' },
    { label: 'Não iniciados', value: progress.total - progress.completed - progress.inProgress, icon: Circle, className: 'text-subtle' },
  ]

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Meu progresso" title="Minha preparação" description={`${plan.position.name} · ${plan.subjects.length} disciplinas`} />
      {plan.subjects.length === 0 ? (
        <EmptyPlan />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            <Card className="flex flex-col items-center p-6 sm:p-8">
              <h2 className="self-start text-base font-bold tracking-tight">Progresso geral</h2>
              <ProgressRing value={progress.ratio} size={200} stroke={16} className="mt-6">
                <div>
                  <p className="text-5xl font-extrabold tracking-tight tabular-nums">{percent(progress.ratio)}</p>
                  <p className="text-sm text-muted">
                    {progress.completed} de {progress.total}
                  </p>
                </div>
              </ProgressRing>
              <ul className="mt-8 w-full space-y-2">
                {legend.map(({ label, value, icon: Icon, className }) => (
                  <li key={label} className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] px-4 py-2.5 text-sm">
                    <Icon className={`size-4 ${className}`} aria-hidden />
                    <span className="flex-1 font-medium">{label}</span>
                    <span className="font-bold tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Concluídos recentemente</CardTitle>
                <History className="size-4 text-subtle" aria-hidden />
              </CardHeader>
              <CardContent className="pt-3">
                {recent.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="Nada por aqui ainda" description="Os assuntos que você concluir aparecem aqui." className="border-none py-6" />
                ) : (
                  <ul className="space-y-1">
                    {recent.map((t) => {
                      const ref = topicIndex.get(t.topicId)!
                      return (
                        <li key={t.topicId}>
                          <Link to={`/assunto/${t.topicId}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-foreground/[0.03]">
                            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-success text-white">
                              <CheckCircle2 className="size-3.5" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{ref.planTopic.topic.name}</span>
                              <span className="block truncate text-xs text-muted">{ref.subject.subject.name}</span>
                            </span>
                            <span className="shrink-0 text-xs text-subtle">{formatRelative(t.completedAt)}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progresso por disciplina</CardTitle>
              <span className="flex items-center gap-3 text-xs text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary" /> Concluído
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-primary-soft/60" /> Em andamento
                </span>
              </span>
            </CardHeader>
            <CardContent>
              <SubjectBars subjects={plan.subjects} statuses={statuses} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
