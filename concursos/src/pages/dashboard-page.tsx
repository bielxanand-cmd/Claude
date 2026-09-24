import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, Clock3, Layers, NotebookPen, Target, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyPlan } from '@/components/study/empty-plan'
import { DemoBadge, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { PageHeader, SectionTitle } from '@/components/study/page-header'
import { StatCard } from '@/components/study/stat-card'
import { StatusBadge, StatusToggle } from '@/components/study/status'
import { SubjectGrid } from '@/components/study/subject-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useProfile, useStudy } from '@/data/queries'
import { referenceOrganization } from '@/domain/labels'
import { nextTopics, planProgress, statusOf, subjectProgress, subjectsNeedingAttention } from '@/domain/progress'
import { useTopicActions } from '@/hooks/use-topic-actions'
import { htmlToText, percent, pluralize } from '@/lib/text'
import { formatRelative } from '@/lib/utils'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

export function DashboardPage() {
  const study = useStudy()
  const profile = useProfile()
  const { setStatus } = useTopicActions()
  const { plan, selection, statuses, topicIndex, summaryIndex, userTopics, summaries } = study

  if (study.error) return <ErrorState error={study.error} onRetry={study.refetch} />
  if (study.isLoading || !plan) return <PageSkeleton />

  const progress = planProgress(plan, statuses)
  const planSummaries = summaries.filter((s) => topicIndex.has(s.topicId))
  const lastAccessed = userTopics
    .filter((t) => t.lastAccessedAt && topicIndex.has(t.topicId))
    .sort((a, b) => b.lastAccessedAt!.localeCompare(a.lastAccessedAt!))[0]
  const upcoming = nextTopics(plan, statuses, 6)
  const continueRef = lastAccessed ? topicIndex.get(lastAccessed.topicId)! : upcoming[0] ? { subject: upcoming[0].subject, planTopic: upcoming[0].planTopic } : null
  const attention = subjectsNeedingAttention(plan, statuses)
  const recentSummaries = [...planSummaries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3)
  const firstName = profile.data?.name.split(' ')[0]

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow={`${greeting()}${firstName ? `, ${firstName}` : ''} 👋`}
        title={plan.position.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Sua preparação · {referenceOrganization(plan, selection)} — {plan.career.name}
            {plan.hasDemoData && <DemoBadge />}
          </span>
        }
        actions={
          <Button asChild variant="outline">
            <Link to="/disciplinas">
              <Layers /> Ver disciplinas
            </Link>
          </Button>
        }
      />

      {plan.subjects.length === 0 ? (
        <EmptyPlan />
      ) : (
        <>
          <section aria-label="Resumo do progresso" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Progresso geral" value={percent(progress.ratio)} icon={TrendingUp}>
              <ProgressBar value={progress.ratio} className="mt-3" label="Progresso geral" />
            </StatCard>
            <StatCard label="Assuntos estudados" value={`${progress.completed} / ${progress.total}`} hint={`${progress.inProgress} em andamento`} icon={CheckCircle2} tone="success" />
            <StatCard label="Disciplinas" value={plan.subjects.length} hint={`${plan.contests.length} editais analisados`} icon={BookOpen} tone="dark" />
            <StatCard label="Resumos criados" value={planSummaries.length} hint={planSummaries.length ? `último ${formatRelative(recentSummaries[0]?.updatedAt)}` : 'Nenhum ainda'} icon={NotebookPen} tone="warning" />
          </section>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {continueRef && (
                <ContinueCard
                  resumed={!!lastAccessed}
                  subjectName={continueRef.subject.subject.name}
                  subjectIcon={continueRef.subject.subject.icon}
                  topicId={continueRef.planTopic.topic.id}
                  topicName={continueRef.planTopic.topic.name}
                  subjectRatio={subjectProgress(continueRef.subject, statuses).ratio}
                  status={statusOf(statuses, continueRef.planTopic.topic.id)}
                  when={lastAccessed?.lastAccessedAt ?? null}
                />
              )}

              <Card>
                <div className="flex items-center justify-between gap-3 p-5 pb-2 sm:px-6">
                  <h2 className="text-base font-bold tracking-tight">Próximos assuntos</h2>
                  <span className="text-xs font-medium text-muted">{progress.pending} pendentes</span>
                </div>
                {upcoming.length === 0 ? (
                  <p className="px-6 pb-6 text-sm text-muted">Você concluiu todos os assuntos. Parabéns! 🎉</p>
                ) : (
                  <ul className="px-2 pb-3 sm:px-3">
                    {upcoming.map(({ subject, planTopic, status }) => (
                      <li key={planTopic.topic.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-foreground/[0.03]">
                        <StatusToggle status={status} label={planTopic.topic.name} onToggle={(el) => setStatus(planTopic.topic.id, 'completed', el)} />
                        <Link to={`/assunto/${planTopic.topic.id}`} className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{planTopic.topic.name}</p>
                          <p className="truncate text-xs text-muted">{subject.subject.name}</p>
                        </Link>
                        {status === 'in_progress' && <StatusBadge status={status} className="hidden sm:inline-flex" />}
                        <Link to={`/assunto/${planTopic.topic.id}`} className="text-subtle transition hover:text-primary" aria-label={`Estudar ${planTopic.topic.name}`}>
                          <ArrowRight className="size-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-5 sm:p-6">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-warning" aria-hidden />
                  <h2 className="text-base font-bold tracking-tight">Precisa de atenção</h2>
                </div>
                <p className="mt-1 text-[13px] text-muted">Disciplinas abaixo da sua média, priorizando as de maior peso.</p>
                {attention.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    {progress.completed === 0 ? 'Conclua seus primeiros assuntos para ver aqui as disciplinas que estão ficando para trás.' : 'Tudo equilibrado por aqui. 👏'}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {attention.map(({ subject, progress: p }) => (
                      <li key={subject.subject.id}>
                        <Link to={`/disciplina/${subject.subject.id}`} className="group block">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-semibold group-hover:text-primary">{subject.subject.name}</span>
                            <span className="shrink-0 font-bold tabular-nums">{percent(p.ratio)}</span>
                          </div>
                          <ProgressBar value={p.ratio} size="sm" className="mt-1.5" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold tracking-tight">Resumos recentes</h2>
                  <Link to="/resumos" className="text-xs font-semibold text-primary hover:underline dark:text-primary-soft">
                    Ver todos
                  </Link>
                </div>
                {recentSummaries.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Seus resumos aparecerão aqui. Abra um assunto e comece a escrever.</p>
                ) : (
                  <ul className="mt-3 space-y-1">
                    {recentSummaries.map((s) => {
                      const ref = topicIndex.get(s.topicId)!
                      return (
                        <li key={s.topicId}>
                          <Link to={`/assunto/${s.topicId}`} className="-mx-2 block rounded-xl px-2 py-2 transition hover:bg-foreground/[0.03]">
                            <p className="truncate text-sm font-semibold">{ref.planTopic.topic.name}</p>
                            <p className="line-clamp-1 text-xs text-muted">{htmlToText(s.content.summary) || s.plainText || 'Sem texto'}</p>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </div>
          </div>

          <section className="mt-10">
            <SectionTitle
              title="Suas disciplinas"
              action={
                <Link to="/disciplinas" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline dark:text-primary-soft">
                  Ver todas <ArrowRight className="size-4" />
                </Link>
              }
            />
            <SubjectGrid subjects={plan.subjects.slice(0, 6)} statuses={statuses} />
          </section>

          <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-subtle">
            <Target className="size-3.5" aria-hidden /> {pluralize(summaryIndex.size, 'resumo', 'resumos')} · {pluralize(progress.completed, 'assunto concluído', 'assuntos concluídos')} no total
          </p>
        </>
      )}
    </div>
  )
}

function ContinueCard(props: {
  resumed: boolean
  subjectName: string
  subjectIcon: string
  topicId: string
  topicName: string
  subjectRatio: number
  status: ReturnType<typeof statusOf>
  when: string | null
}) {
  return (
    <section aria-label="Continue de onde parou" className="relative overflow-hidden rounded-2xl bg-[#09090B] p-6 text-white shadow-lift sm:p-7">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-[#7C3AED] opacity-40 blur-[80px]" />
      <div className="relative">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C4B5FD]">
          <Clock3 className="size-3.5" aria-hidden />
          {props.resumed ? 'Continue de onde parou' : 'Comece por aqui'}
          {props.when && <span className="font-medium normal-case tracking-normal text-white/50">· {formatRelative(props.when)}</span>}
        </p>
        <div className="mt-4 flex items-start gap-3">
          <IconTile icon={props.subjectIcon} className="bg-white/10 text-[#C4B5FD]" />
          <div className="min-w-0">
            <p className="text-sm text-white/60">{props.subjectName}</p>
            <h2 className="text-xl font-bold leading-snug sm:text-2xl">{props.topicName}</h2>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-xs font-semibold text-white/60">
              <span>Progresso na disciplina</span>
              <span className="text-white">{percent(props.subjectRatio)}</span>
            </div>
            <ProgressBar value={props.subjectRatio} className="mt-2 bg-white/10" />
          </div>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link to={`/assunto/${props.topicId}`}>
              {props.resumed ? 'Continuar estudando' : 'Começar a estudar'} <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
