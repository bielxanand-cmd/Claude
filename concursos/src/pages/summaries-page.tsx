import { ArrowRight, NotebookPen, Search, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { IconTile } from '@/components/study/icon-registry'
import { PageHeader } from '@/components/study/page-header'
import { StatusBadge } from '@/components/study/status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useDeleteSummary, useStudy } from '@/data/queries'
import { statusOf } from '@/domain/progress'
import { htmlToText, normalize, pluralize } from '@/lib/text'
import { formatRelative } from '@/lib/utils'

export function SummariesPage() {
  const { plan, summaries, topicIndex, statuses, isLoading, error, refetch } = useStudy()
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [toDelete, setToDelete] = useState<string | null>(null)
  const remove = useDeleteSummary()

  const items = useMemo(
    () =>
      summaries
        .filter((s) => topicIndex.has(s.topicId))
        .map((s) => ({ summary: s, ref: topicIndex.get(s.topicId)! }))
        .sort((a, b) => b.summary.updatedAt.localeCompare(a.summary.updatedAt)),
    [summaries, topicIndex],
  )

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !plan) return <PageSkeleton />

  const subjectsWithSummaries = plan.subjects.filter((s) => items.some((i) => i.ref.subject.subject.id === s.subject.id))
  const q = normalize(query)
  const filtered = items.filter(
    ({ summary, ref }) =>
      (subjectFilter === 'all' || ref.subject.subject.id === subjectFilter) &&
      (!q || normalize(`${ref.planTopic.topic.name} ${ref.subject.subject.name} ${summary.plainText}`).includes(q)),
  )

  return (
    <div className="animate-fade-in">
      <PageHeader eyebrow="Meus resumos" title="Seus resumos" description={items.length ? `${pluralize(items.length, 'resumo', 'resumos')} em ${pluralize(subjectsWithSummaries.length, 'disciplina', 'disciplinas')}` : undefined} />

      {items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Você ainda não criou resumos"
          description="Abra um assunto, escreva seu resumo, pontos importantes e pegadinhas — tudo fica salvo aqui."
          action={
            <Button asChild>
              <Link to="/disciplinas">
                Escolher um assunto <ArrowRight />
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-subtle" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar nos resumos…" aria-label="Buscar nos resumos" className="pl-10" />
            </div>
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              aria-label="Filtrar por disciplina"
              className="h-11 rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary"
            >
              <option value="all">Todas as disciplinas</option>
              {subjectsWithSummaries.map((s) => (
                <option key={s.subject.id} value={s.subject.id}>
                  {s.subject.name}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Search} title="Nenhum resumo encontrado" description="Tente outro termo ou disciplina." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map(({ summary, ref }) => {
                const preview = htmlToText(summary.content.summary) || summary.plainText
                return (
                  <Card key={summary.topicId} interactive className="group relative flex flex-col p-5">
                    <div className="flex items-start gap-3">
                      <IconTile icon={ref.subject.subject.icon} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-muted">{ref.subject.subject.name}</p>
                        <Link to={`/assunto/${summary.topicId}`} className="font-bold leading-snug after:absolute after:inset-0 after:rounded-2xl">
                          {ref.planTopic.topic.name}
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={() => setToDelete(summary.topicId)}
                        className="relative z-10 grid size-8 place-items-center rounded-lg text-subtle opacity-100 transition hover:bg-danger-tint hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                        aria-label={`Excluir resumo de ${ref.planTopic.topic.name}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">{preview || 'Resumo sem texto.'}</p>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <StatusBadge status={statusOf(statuses, summary.topicId)} />
                      <span className="text-xs text-subtle">Editado {formatRelative(summary.updatedAt)}</span>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Excluir resumo?</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita. O status do assunto não será alterado.</DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() =>
                toDelete &&
                remove.mutate(toDelete, {
                  onSuccess: () => {
                    toast('Resumo excluído')
                    setToDelete(null)
                  },
                })
              }
            >
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
