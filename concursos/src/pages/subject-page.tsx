import { ArrowLeft, ArrowRight, BookOpenText, Filter, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { Breadcrumbs } from '@/components/study/page-header'
import { SourceChips } from '@/components/study/sources'
import { STATUS_META } from '@/components/study/status'
import { TopicRow } from '@/components/study/topic-row'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useStudy } from '@/data/queries'
import { statusOf, subjectProgress } from '@/domain/progress'
import type { TopicStatus } from '@/domain/types'
import { FillSubjectDialog } from '@/features/book/fill-subject-dialog'
import { SubjectFlashcards } from '@/features/flashcards/subject-flashcards'
import { useTopicActions } from '@/hooks/use-topic-actions'
import { percent } from '@/lib/text'
import { cn } from '@/lib/utils'

type FilterValue = 'all' | TopicStatus

export function SubjectPage() {
  const { id = '' } = useParams()
  const study = useStudy()
  const { plan, statuses, subjectIndex, summaryIndex, contestIndex, isLoading, error, refetch } = study
  const [bookOpen, setBookOpen] = useState(false)
  const { setStatus } = useTopicActions()
  const [filter, setFilter] = useState<FilterValue>('all')

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !plan) return <PageSkeleton />

  const subject = subjectIndex.get(id)
  if (!subject)
    return (
      <EmptyState
        icon={SearchX}
        title="Disciplina não encontrada"
        description="Ela não faz parte do plano do seu concurso atual."
        action={
          <Button asChild variant="outline">
            <Link to="/disciplinas">Ver disciplinas</Link>
          </Button>
        }
      />
    )

  const progress = subjectProgress(subject, statuses)
  const counts: Record<FilterValue, number> = {
    all: subject.topics.length,
    not_started: subject.topics.length - progress.completed - progress.inProgress,
    in_progress: progress.inProgress,
    completed: progress.completed,
  }
  const topics = subject.topics.filter((t) => filter === 'all' || statusOf(statuses, t.topic.id) === filter)
  const sources = subject.contestIds.map((cid) => contestIndex.get(cid)!).filter(Boolean)
  const index = plan.subjects.indexOf(subject)
  const prev = plan.subjects[index - 1]
  const next = plan.subjects[index + 1]

  const FILTERS: { value: FilterValue; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'not_started', label: STATUS_META.not_started.label },
    { value: 'in_progress', label: STATUS_META.in_progress.label },
    { value: 'completed', label: 'Concluídos' },
  ]

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Disciplinas', to: '/disciplinas' }, { label: subject.subject.name }]} />

      <header className="mb-6 flex items-start gap-4 sm:mb-8">
        <IconTile icon={subject.subject.icon} size="lg" />
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[32px] sm:leading-tight">{subject.subject.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {subject.topics.length} assuntos
            {subject.weight != null && <> · peso médio {subject.weight.toLocaleString('pt-BR')}</>}
            {subject.questionCount != null && <> · ~{Math.round(subject.questionCount)} questões por prova</>}
          </p>
        </div>
      </header>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-muted">Seu progresso</p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight tabular-nums">{percent(progress.ratio)}</p>
          </div>
          <p className="text-sm text-muted">
            <strong className="text-foreground">{progress.completed}</strong> de {progress.total} assuntos concluídos
          </p>
        </div>
        <ProgressBar value={progress.ratio} size="lg" className="mt-4" label={`Progresso em ${subject.subject.name}`} />
        <div className="mt-5 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center">
          <span className="text-xs font-semibold text-muted">Fonte:</span>
          <SourceChips contests={sources} max={6} />
        </div>
      </Card>

      <div className="mt-6 grid gap-4">
        <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary dark:text-primary-soft">
            <BookOpenText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold">Resumos a partir de um livro</h2>
            <p className="mt-0.5 text-sm text-muted">Envie o livro ou a apostila em PDF e preencha os resumos dos assuntos automaticamente.</p>
          </div>
          <Button size="sm" onClick={() => setBookOpen(true)}>
            <BookOpenText /> Enviar livro (PDF)
          </Button>
        </Card>
        <SubjectFlashcards subject={subject} />
      </div>
      <FillSubjectDialog open={bookOpen} onOpenChange={setBookOpen} subject={subject} study={study} />

      <section className="mt-8" aria-label="Assuntos">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight">Assuntos</h2>
          <Filter className="size-4 text-subtle sm:hidden" aria-hidden />
        </div>
        <div role="tablist" aria-label="Filtrar por status" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition',
                filter === value ? 'border-foreground bg-foreground text-background' : 'border-border bg-surface text-muted hover:text-foreground',
              )}
            >
              {label}
              <span className={cn('rounded-full px-1.5 text-xs tabular-nums', filter === value ? 'bg-background/20' : 'bg-foreground/[0.06]')}>{counts[value]}</span>
            </button>
          ))}
        </div>

        {topics.length === 0 ? (
          <EmptyState icon={Filter} title="Nenhum assunto com esse status" className="py-10" />
        ) : (
          <ul className="-mx-3 space-y-1 sm:mx-0">
            {topics.map((planTopic) => (
              <TopicRow
                key={planTopic.topic.id}
                planTopic={planTopic}
                status={statusOf(statuses, planTopic.topic.id)}
                hasSummary={summaryIndex.has(planTopic.topic.id)}
                totalContests={plan.contests.length}
                onStatusChange={(status, origin) => setStatus(planTopic.topic.id, status, origin)}
              />
            ))}
          </ul>
        )}
      </section>

      <nav aria-label="Outras disciplinas" className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
        {prev ? (
          <Link to={`/disciplina/${prev.subject.id}`} className="group rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-surface">
            <span className="flex items-center gap-1 text-xs font-semibold text-muted">
              <ArrowLeft className="size-3.5" /> Anterior
            </span>
            <span className="mt-1 block font-semibold group-hover:text-primary">{prev.subject.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/disciplina/${next.subject.id}`} className="group rounded-2xl border border-border p-4 text-right transition hover:border-primary/40 hover:bg-surface">
            <span className="flex items-center justify-end gap-1 text-xs font-semibold text-muted">
              Próxima <ArrowRight className="size-3.5" />
            </span>
            <span className="mt-1 block font-semibold group-hover:text-primary">{next.subject.name}</span>
          </Link>
        )}
      </nav>
    </div>
  )
}
