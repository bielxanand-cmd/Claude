import { Search } from 'lucide-react'
import { useState } from 'react'
import { EmptyPlan } from '@/components/study/empty-plan'
import { DemoNotice, EmptyState, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { PageHeader } from '@/components/study/page-header'
import { SubjectGrid } from '@/components/study/subject-grid'
import { Input } from '@/components/ui/input'
import { useStudy } from '@/data/queries'
import { planProgress } from '@/domain/progress'
import { normalize, percent } from '@/lib/text'

export function SubjectsPage() {
  const { plan, statuses, isLoading, error, refetch } = useStudy()
  const [query, setQuery] = useState('')

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !plan) return <PageSkeleton />

  const progress = planProgress(plan, statuses)
  const filtered = plan.subjects.filter((s) => normalize(s.subject.name).includes(normalize(query)))

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Disciplinas"
        title={plan.position.name}
        description={`${plan.subjects.length} disciplinas · ${progress.total} assuntos · ${percent(progress.ratio)} concluído`}
      />
      {plan.subjects.length === 0 ? (
        <EmptyPlan />
      ) : (
        <>
          {plan.hasDemoData && <DemoNotice className="mb-6" />}
          <div className="relative mb-6 max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar disciplinas…" aria-label="Filtrar disciplinas" className="pl-10" />
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="Nenhuma disciplina encontrada" description="Tente outro termo." />
          ) : (
            <SubjectGrid subjects={filtered} statuses={statuses} />
          )}
        </>
      )}
    </div>
  )
}
