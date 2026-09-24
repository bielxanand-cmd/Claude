import { AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle2, Layers3, Lightbulb, Network, NotebookPen, Save, SearchX, StickyNote } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useBlocker, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { isEmptyHtml, RichEditor } from '@/components/editor/rich-editor'
import { EmptyState, ErrorState, PageSkeleton } from '@/components/study/feedback'
import { Breadcrumbs } from '@/components/study/page-header'
import { SourceChips } from '@/components/study/sources'
import { StatusControl } from '@/components/study/status'
import { FrequencyPill } from '@/components/study/topic-row'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useFlashcards, useSaveSummary, useStudy, type Study } from '@/data/queries'
import type { Flashcard } from '@/domain/flashcards'
import { statusOf } from '@/domain/progress'
import type { SummaryContent } from '@/domain/types'
import { AiPanel } from '@/features/ai/ai-panel'
import { FlashcardsDialog } from '@/features/flashcards/flashcards-dialog'
import { StudySession } from '@/features/flashcards/study-session'
import { MindMapDialog } from '@/features/mind-map/mind-map-dialog'
import { useTopicActions } from '@/hooks/use-topic-actions'
import { cn, formatRelative, formatTime } from '@/lib/utils'

const EMPTY_CONTENT: SummaryContent = { summary: '', keyPoints: '', pitfalls: '', notes: '' }

/** Cor de cada campo no mapa mental. */
const SECTION_COLORS: Record<keyof SummaryContent, string> = { summary: '#7C3AED', keyPoints: '#D97706', pitfalls: '#DC2626', notes: '#0891B2' }

const SECTIONS: { key: keyof SummaryContent; title: string; hint: string; icon: typeof NotebookPen; minHeight: number; placeholder: string }[] = [
  { key: 'summary', title: 'Meu resumo', hint: 'O essencial do assunto com suas palavras.', icon: NotebookPen, minHeight: 240, placeholder: 'Escreva seu resumo… Use títulos, listas e destaques para organizar.' },
  { key: 'keyPoints', title: 'Pontos importantes', hint: 'O que mais cai e precisa estar na ponta da língua.', icon: Lightbulb, minHeight: 120, placeholder: 'Ex.: prazos, exceções, súmulas, artigos-chave…' },
  { key: 'pitfalls', title: 'Pegadinhas', hint: 'Armadilhas comuns das bancas.', icon: AlertTriangle, minHeight: 120, placeholder: 'Ex.: “é vedado” × “é facultado”, exceções à regra…' },
  { key: 'notes', title: 'Observações', hint: 'Dúvidas, links, referências e lembretes.', icon: StickyNote, minHeight: 100, placeholder: 'Anotações livres…' },
]

const normalizeContent = (c: SummaryContent): SummaryContent => ({
  summary: isEmptyHtml(c.summary) ? '' : c.summary,
  keyPoints: isEmptyHtml(c.keyPoints) ? '' : c.keyPoints,
  pitfalls: isEmptyHtml(c.pitfalls) ? '' : c.pitfalls,
  notes: isEmptyHtml(c.notes) ? '' : c.notes,
})
const sameContent = (a: SummaryContent, b: SummaryContent) => JSON.stringify(normalizeContent(a)) === JSON.stringify(normalizeContent(b))

export function TopicPage() {
  const { id = '' } = useParams()
  const study = useStudy()

  if (study.error) return <ErrorState error={study.error} onRetry={study.refetch} />
  if (study.isLoading || !study.plan) return <PageSkeleton />
  if (!study.topicIndex.has(id))
    return (
      <EmptyState
        icon={SearchX}
        title="Assunto não encontrado"
        description="Ele não faz parte do plano do seu concurso atual."
        action={
          <Button asChild variant="outline">
            <Link to="/disciplinas">Ver disciplinas</Link>
          </Button>
        }
      />
    )

  return <TopicStudy key={id} topicId={id} study={study} />
}

function TopicStudy({ topicId, study }: { topicId: string; study: Study }) {
  const { plan, statuses, topicIndex, summaryIndex, contestIndex } = study
  const { subject, planTopic } = topicIndex.get(topicId)!
  const status = statusOf(statuses, topicId)
  const saved = summaryIndex.get(topicId)
  const savedContent = saved?.content ?? EMPTY_CONTENT

  const [draft, setDraft] = useState<SummaryContent>(savedContent)
  const [justSaved, setJustSaved] = useState(false)
  const [mindMapOpen, setMindMapOpen] = useState(false)
  const [flashcardsOpen, setFlashcardsOpen] = useState(false)
  const [studyCards, setStudyCards] = useState<Flashcard[] | null>(null)
  const flashcards = useFlashcards()
  const deckSize = (flashcards.data ?? []).filter((c) => c.topicId === topicId).length
  const mindMapSections = useMemo(
    () => SECTIONS.map(({ key, title }) => ({ key, label: title, color: SECTION_COLORS[key], html: draft[key] })),
    [draft],
  )
  const saveSummary = useSaveSummary()
  const { setStatus, touch } = useTopicActions()
  const completeRef = useRef<HTMLButtonElement>(null)

  const dirty = !sameContent(draft, savedContent)
  const hasContent = Object.values(draft).some((v) => !isEmptyHtml(v))

  // Registra o acesso (alimenta "Continue de onde parou").
  useEffect(() => {
    touch(topicId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId])

  const save = useCallback(
    async (options?: { silent?: boolean }) => {
      try {
        await saveSummary.mutateAsync({ topicId, content: normalizeContent(draft) })
        setJustSaved(true)
        setTimeout(() => setJustSaved(false), 2000)
        if (!options?.silent) toast.success('Resumo salvo!', { description: planTopic.topic.name })
        if (status === 'not_started') setStatus(topicId, 'in_progress')
        return true
      } catch {
        toast.error('Não foi possível salvar o resumo. Tente novamente.')
        return false
      }
    },
    [draft, planTopic.topic.name, saveSummary, setStatus, status, topicId],
  )

  // Ctrl/Cmd + S
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty) void save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dirty, save])

  // Aviso ao sair com alterações não salvas
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname)

  const complete = async () => {
    if (dirty && !(await save({ silent: true }))) return
    setStatus(topicId, 'completed', completeRef.current)
  }

  const sources = useMemo(() => planTopic.contestIds.map((id) => contestIndex.get(id)!).filter(Boolean), [planTopic.contestIds, contestIndex])
  const index = subject.topics.indexOf(planTopic)
  const prev = subject.topics[index - 1]
  const next = subject.topics[index + 1]

  const saveLabel = saveSummary.isPending
    ? 'Salvando…'
    : dirty
      ? 'Alterações não salvas'
      : saved
        ? `Salvo ${formatRelative(saved.updatedAt) === 'agora' ? `às ${formatTime(saved.updatedAt)}` : formatRelative(saved.updatedAt)}`
        : 'Nenhum resumo ainda'

  return (
    <div className="animate-fade-in pb-20">
      <Breadcrumbs
        items={[
          { label: 'Disciplinas', to: '/disciplinas' },
          { label: subject.subject.name, to: `/disciplina/${subject.subject.id}` },
          { label: planTopic.topic.name },
        ]}
      />

      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-balance sm:text-[32px] sm:leading-tight">{planTopic.topic.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Disciplina:{' '}
          <Link to={`/disciplina/${subject.subject.id}`} className="font-semibold text-foreground hover:text-primary">
            {subject.subject.name}
          </Link>
        </p>
        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs font-semibold text-muted">Status</span>
            <StatusControl value={status} onChange={(s) => setStatus(topicId, s, s === 'completed' ? completeRef.current : null)} className="w-full sm:w-auto" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMindMapOpen(true)}>
              <Network /> Criar mapa mental
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setFlashcardsOpen(true)}>
              <Layers3 /> Flashcards
              {deckSize > 0 && <span className="rounded-full bg-primary px-1.5 text-[11px] font-bold text-white tabular-nums">{deckSize}</span>}
            </Button>
            <FrequencyPill frequency={planTopic.frequency} total={plan!.contests.length} />
            <SourceChips contests={sources} max={3} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-5">
          {SECTIONS.map(({ key, title, hint, icon: Icon, minHeight, placeholder }) => (
            <section key={key} aria-labelledby={`section-${key}`}>
              <div className="mb-2 flex items-baseline gap-2">
                <Icon className="size-4 translate-y-0.5 text-primary dark:text-primary-soft" aria-hidden />
                <h2 id={`section-${key}`} className="font-bold tracking-tight">
                  {title}
                </h2>
                <p className="hidden truncate text-xs text-muted sm:block">{hint}</p>
              </div>
              <RichEditor
                value={draft[key]}
                onChange={(html) => setDraft((d) => ({ ...d, [key]: html }))}
                placeholder={placeholder}
                ariaLabel={title}
                minHeight={minHeight}
              />
            </section>
          ))}

          <nav aria-label="Outros assuntos" className="grid gap-3 pt-4 sm:grid-cols-2">
            {prev ? (
              <Link to={`/assunto/${prev.topic.id}`} className="group rounded-2xl border border-border p-4 transition hover:border-primary/40 hover:bg-surface">
                <span className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <ArrowLeft className="size-3.5" /> Assunto anterior
                </span>
                <span className="mt-1 block text-sm font-semibold group-hover:text-primary">{prev.topic.name}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link to={`/assunto/${next.topic.id}`} className="group rounded-2xl border border-border p-4 text-right transition hover:border-primary/40 hover:bg-surface">
                <span className="flex items-center justify-end gap-1 text-xs font-semibold text-muted">
                  Próximo assunto <ArrowRight className="size-3.5" />
                </span>
                <span className="mt-1 block text-sm font-semibold group-hover:text-primary">{next.topic.name}</span>
              </Link>
            )}
          </nav>
        </div>

        <aside className="space-y-5">
          {planTopic.details.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-bold">O que o edital cobra</h2>
              <p className="mt-1 text-xs text-muted">Subitens listados no conteúdo programático.</p>
              <ul className="mt-3 space-y-2">
                {planTopic.details.map((d) => (
                  <li key={d} className="flex gap-2 text-sm leading-snug">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary-soft" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="text-sm font-bold">Onde este assunto foi cobrado</h2>
            <p className="mt-1 text-xs text-muted">
              Presente em {planTopic.contestIds.length} de {plan!.contests.length} editais analisados para {plan!.position.name}.
            </p>
            <ul className="mt-3 space-y-1.5">
              {sources.map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <Check className="size-3.5 text-success" aria-hidden />
                  <span className="truncate">
                    {c.organizationShort} {c.year && <span className="text-muted">· {c.year}</span>}
                  </span>
                  {c.origin === 'demo' && <span className="ml-auto text-[10px] font-semibold uppercase text-[#b45309] dark:text-warning">demo</span>}
                </li>
              ))}
            </ul>
          </Card>
          <AiPanel onAction={{ mind_map: () => setMindMapOpen(true), flashcards: () => setFlashcardsOpen(true) }} />
        </aside>
      </div>

      {/* Barra de ações fixa (portal: independe de transformações dos ancestrais) */}
      {createPortal(
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/90 backdrop-blur-xl lg:left-[260px]">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6 lg:px-8" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to={`/disciplina/${subject.subject.id}`}>
              <ArrowLeft /> Voltar para disciplina
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon-sm" className="md:hidden" aria-label="Voltar para disciplina">
            <Link to={`/disciplina/${subject.subject.id}`}>
              <ArrowLeft />
            </Link>
          </Button>
          <p aria-live="polite" className={cn('min-w-0 flex-1 truncate text-xs font-medium', dirty ? 'text-warning' : 'text-muted')}>
            {dirty && <span className="mr-1.5 inline-block size-1.5 rounded-full bg-warning align-middle" />}
            {saveLabel}
          </p>
          <Button
            variant={justSaved ? 'success' : 'outline'}
            size="sm"
            onClick={() => save()}
            disabled={!dirty && !justSaved}
            loading={saveSummary.isPending}
            className="h-10 sm:h-9"
          >
            {justSaved ? <Check className="animate-pop" /> : !saveSummary.isPending && <Save />}
            <span className="hidden sm:inline">{justSaved ? 'Salvo' : hasContent || dirty ? 'Salvar' : 'Salvar resumo'}</span>
            <span className="sm:hidden">{justSaved ? 'Salvo' : 'Salvar'}</span>
          </Button>
          {status === 'completed' ? (
            <Button ref={completeRef} variant="secondary" size="sm" className="h-10 sm:h-9" onClick={() => setStatus(topicId, 'in_progress')}>
              <CheckCircle2 className="text-success" /> <span className="hidden sm:inline">Concluído</span>
              <span className="sm:hidden">Feito</span>
            </Button>
          ) : (
            <Button ref={completeRef} variant="success" size="sm" className="h-10 sm:h-9" onClick={complete}>
              <Check /> <span className="hidden sm:inline">Marcar como concluído</span>
              <span className="sm:hidden">Concluir</span>
            </Button>
          )}
        </div>
      </div>,
        document.body,
      )}

      <FlashcardsDialog
        open={flashcardsOpen}
        onOpenChange={setFlashcardsOpen}
        topicId={topicId}
        topicName={planTopic.topic.name}
        subjectName={subject.subject.name}
        positionName={plan!.position.name}
        content={draft}
        onStudy={(cards) => {
          setFlashcardsOpen(false)
          setStudyCards(cards)
        }}
      />
      <StudySession
        open={!!studyCards}
        onOpenChange={(open) => !open && setStudyCards(null)}
        cards={studyCards ?? []}
        title={`Flashcards · ${planTopic.topic.name}`}
      />

      <MindMapDialog
        open={mindMapOpen}
        onOpenChange={setMindMapOpen}
        title={planTopic.topic.name}
        subtitle={`${subject.subject.name} · ${plan!.position.name}`}
        sections={mindMapSections}
      />

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.state === 'blocked' && blocker.reset()}>
        <DialogContent className="max-w-md">
          <DialogTitle>Salvar alterações?</DialogTitle>
          <DialogDescription>Você tem alterações no resumo de “{planTopic.topic.name}” que ainda não foram salvas.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => blocker.state === 'blocked' && blocker.proceed()}>
              Descartar
            </Button>
            <Button
              onClick={async () => {
                if ((await save({ silent: true })) && blocker.state === 'blocked') blocker.proceed()
              }}
              loading={saveSummary.isPending}
            >
              Salvar e sair
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
