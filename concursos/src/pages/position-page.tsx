import { ArrowRight, Check, SearchX } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyPlan } from '@/components/study/empty-plan'
import { DemoNotice, EmptyState, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { Breadcrumbs, PageHeader, SectionTitle } from '@/components/study/page-header'
import { PositionOverview } from '@/components/study/position-overview'
import { ContestRow } from '@/components/study/sources'
import { SubjectGrid } from '@/components/study/subject-grid'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { usePlan, useSelection, useSetSelection, useUserTopics } from '@/data/queries'
import { referenceOrganization } from '@/domain/labels'
import { planProgress, toStatusMap } from '@/domain/progress'

export function PositionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const plan = usePlan(id)
  const selection = useSelection()
  const userTopics = useUserTopics()
  const setSelection = useSetSelection()

  if (plan.error) return <ErrorState error={plan.error} onRetry={() => plan.refetch()} />
  if (plan.isLoading || userTopics.isLoading) return <PageSkeleton />
  if (!plan.data)
    return (
      <EmptyState
        icon={SearchX}
        title="Cargo não encontrado"
        action={
          <Button asChild variant="outline">
            <Link to="/cargos">Ver cargos</Link>
          </Button>
        }
      />
    )

  const p = plan.data
  const isActive = selection.data?.positionId === p.position.id
  const statuses = toStatusMap(userTopics.data ?? [])
  const progress = planProgress(p, statuses)
  const refSelection = isActive ? selection.data! : { sphere: p.position.spheres[0] ?? 'federal', state: null }

  const choose = () =>
    setSelection.mutate(
      { positionId: p.position.id, sphere: p.position.spheres[0] ?? 'federal', state: p.contests.find((c) => c.state)?.state ?? null },
      {
        onSuccess: () => {
          toast.success('Concurso atualizado!', { description: p.position.name })
          navigate('/dashboard')
        },
      },
    )

  return (
    <div className="animate-fade-in">
      <Breadcrumbs items={[{ label: 'Cargos', to: '/cargos' }, { label: p.position.name }]} />
      <PageHeader
        eyebrow={p.career.name}
        title={p.position.name}
        description={`${referenceOrganization(p, refSelection)} — ${p.career.name}`}
        actions={
          isActive ? (
            <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-success-tint px-4 text-sm font-semibold text-success-strong">
              <Check className="size-4" /> Seu concurso atual
            </span>
          ) : (
            <Button onClick={choose} loading={setSelection.isPending}>
              Estudar para este cargo <ArrowRight />
            </Button>
          )
        }
      />

      {p.subjects.length === 0 ? (
        <EmptyPlan />
      ) : (
        <div className="space-y-8">
          <PositionOverview progress={progress} subjectCount={p.subjects.length} />
          {p.hasDemoData && <DemoNotice />}
          <section id="disciplinas">
            <SectionTitle title="Disciplinas" />
            <SubjectGrid subjects={p.subjects} statuses={statuses} />
          </section>
          <section>
            <SectionTitle title="Editais utilizados" />
            <Card className="p-2">
              <ul>
                {p.contests.map((c) => (
                  <ContestRow key={c.id} contest={c} highlight={isActive && !!selection.data?.state && c.state === selection.data.state} />
                ))}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </div>
  )
}
