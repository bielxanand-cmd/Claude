import { Bot, Check, FileText, Flame, Loader2, Trash2, TriangleAlert, Upload, Wand2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { EmptyPlan } from '@/components/study/empty-plan'
import { ErrorState, PageSkeleton } from '@/components/study/feedback'
import { PageHeader } from '@/components/study/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useDeleteExamAnalysis, useExamAnalyses, useSaveExamAnalysis, useStudy } from '@/data/queries'
import { aggregateExams, OTHER_TOPIC, UNIDENTIFIED, type AggregatedSubject, type ExamAnalysis } from '@/domain/exam-analysis'
import { useClaudeSample } from '@/features/ai/claude-sample'
import { ModePicker, type AssistantMode } from '@/features/assistant/shared'
import { analyzeExamFile, NoQuestionsError, type AnalyzeProgress } from '@/features/exams/analyze'
import { PdfReadError } from '@/features/import/pdf-text'
import { pluralize } from '@/lib/text'
import { cn, formatRelative } from '@/lib/utils'

const pct = (x: number) => `${(x * 100).toLocaleString('pt-BR', { maximumFractionDigits: x < 0.1 ? 1 : 0 })}%`

type Job = { name: string; status: 'reading' | 'classifying' | 'done' | 'error'; detail: string }

/** Assuntos que mais caem: provas anteriores do cargo, questões por disciplina e assuntos mais cobrados. */
export function ExamsPage() {
  const { plan, selection, isLoading, error, refetch } = useStudy()
  const exams = useExamAnalyses()
  const saveExam = useSaveExamAnalysis()
  const deleteExam = useDeleteExamAnalysis()
  const { sample } = useClaudeSample()
  const [mode, setMode] = useState<AssistantMode>('ai')
  const [jobs, setJobs] = useState<Job[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [toDelete, setToDelete] = useState<ExamAnalysis | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const busy = jobs.some((j) => j.status === 'reading' || j.status === 'classifying')

  const positionId = plan?.position.id
  const mine = useMemo(
    () => (exams.data ?? []).filter((e) => e.positionId === positionId).sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || b.createdAt.localeCompare(a.createdAt)),
    [exams.data, positionId],
  )
  const selected = filter === 'all' ? mine : mine.filter((e) => e.id === filter)
  const agg = useMemo(() => aggregateExams(selected), [selected])

  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (isLoading || !plan || !selection) return <PageSkeleton />

  const upload = async (fileList: FileList) => {
    const files = Array.from(fileList).filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf')
    if (files.length === 0) {
      toast.error('Envie provas em PDF.')
      return
    }
    const useAi = !!sample && mode === 'ai'
    setJobs(files.map((f) => ({ name: f.name, status: 'reading', detail: 'Na fila…' })))
    for (const [i, file] of files.entries()) {
      const update = (patch: Partial<Job>) => setJobs((all) => all.map((j, k) => (k === i ? { ...j, ...patch } : j)))
      try {
        const onProgress = (p: AnalyzeProgress) =>
          update(
            p.stage === 'read'
              ? { status: 'reading', detail: `Lendo página ${p.done} de ${p.total}…` }
              : { status: 'classifying', detail: `Classificando com o Claude… ${p.done} de ${p.total} partes` },
          )
        const result = await analyzeExamFile({ file, plan, sample: useAi ? sample : null, onProgress })
        await saveExam.mutateAsync(result)
        update({ status: 'done', detail: `${pluralize(result.totalQuestions, 'questão', 'questões')} em ${pluralize(result.subjects.length, 'disciplina', 'disciplinas')}` })
        setFilter('all')
      } catch (e) {
        const detail =
          e instanceof NoQuestionsError
            ? 'Não encontramos questões numeradas. A prova é escaneada (imagem)?'
            : e instanceof PdfReadError
              ? e.message
              : 'Não foi possível ler este PDF.'
        update({ status: 'error', detail })
      }
    }
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Mais cobrados"
        title="Assuntos que mais caem"
        description={`${plan.position.name} · ${mine.length ? `com base em ${mine.length} ${mine.length === 1 ? 'prova anterior' : 'provas anteriores'}` : 'envie provas anteriores para começar'}`}
      />
      {plan.subjects.length === 0 ? (
        <EmptyPlan />
      ) : (
        <div className="space-y-6">
          {/* Envio */}
          <Card className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary dark:text-primary-soft">
                <Flame className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">Enviar provas anteriores</h2>
                <p className="mt-0.5 text-sm text-muted">
                  Envie uma ou várias provas em PDF. O app conta as questões de cada disciplina e identifica os assuntos do seu plano que cada questão cobra. Os resultados ficam salvos para {plan.position.name}.
                </p>
                {sample && (
                  <div className="mt-4 max-w-2xl">
                    <ModePicker
                      mode={mode}
                      onChange={setMode}
                      aiAvailable
                      disabled={busy}
                      aiHint="O Claude lê cada questão e escolhe a disciplina e o assunto do plano. Mais preciso; usa a sua cota do Claude."
                      autoHint="Pelos títulos da prova e pelas palavras-chave dos assuntos. Rápido, sem IA; confira os resultados."
                    />
                  </div>
                )}
              </div>
              <Button onClick={() => input.current?.click()} disabled={busy} className="shrink-0">
                {busy ? <Loader2 className="animate-spin" /> : <Upload />} Enviar provas (PDF)
              </Button>
              <input
                ref={input}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                aria-label="Enviar provas anteriores em PDF"
                onChange={(e) => {
                  if (e.target.files?.length) void upload(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>
            {jobs.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t border-border pt-4" aria-label="Provas enviadas agora">
                {jobs.map((j, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm">
                    {j.status === 'done' ? (
                      <Check className="size-4 shrink-0 text-success" aria-hidden />
                    ) : j.status === 'error' ? (
                      <TriangleAlert className="size-4 shrink-0 text-danger" aria-hidden />
                    ) : (
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
                    )}
                    <span className="min-w-0 truncate font-medium">{j.name}</span>
                    <span className={cn('shrink-0 text-xs', j.status === 'error' ? 'text-danger' : 'text-muted')} role="status">
                      {j.detail}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {mine.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">
              <p className="font-semibold text-foreground">Nenhuma prova analisada para {plan.position.name}</p>
              <p className="mt-1">Envie provas anteriores (de preferência da mesma banca) para ver quantas questões cada disciplina teve e quais assuntos mais caíram.</p>
            </Card>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  aria-label="Escolher prova"
                  className="h-10 rounded-xl border border-border bg-surface px-3 text-sm shadow-soft outline-none focus:border-primary"
                >
                  <option value="all">Todas as provas ({mine.length})</option>
                  {mine.map((e) => (
                    <option key={e.id} value={e.id}>
                      {examLabel(e)}
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Stat label={selected.length === 1 ? 'prova' : 'provas'} value={selected.length} />
                  <Stat label="questões" value={agg.total} />
                  <Stat label="disciplinas" value={agg.subjects.filter((s) => s.name !== UNIDENTIFIED).length} />
                </div>
              </div>

              <Card className="p-5 sm:p-6">
                <h2 className="font-bold">Questões por disciplina</h2>
                <p className="mt-0.5 text-xs text-muted">Quantidade de questões e quanto cada disciplina representa do total{selected.length > 1 ? ' (somando as provas)' : ''}.</p>
                <table className="mt-4 w-full text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th>Disciplina</th>
                      <th>Questões</th>
                      <th>% do total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agg.subjects.map((s) => (
                      <SubjectRow key={s.key} subject={s} />
                    ))}
                  </tbody>
                </table>
              </Card>

              <section aria-labelledby="top-topics">
                <h2 id="top-topics" className="mb-3 text-lg font-bold tracking-tight">
                  Assuntos mais pedidos por disciplina
                </h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {agg.subjects
                    .filter((s) => s.name !== UNIDENTIFIED)
                    .map((s) => (
                      <TopicsCard key={s.key} subject={s} several={selected.length > 1} />
                    ))}
                </div>
              </section>

              <Card className="p-5 sm:p-6">
                <h2 className="font-bold">Provas analisadas</h2>
                <ul className="mt-3 divide-y divide-border">
                  {mine.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-foreground/[0.05] text-muted">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{examLabel(e)}</p>
                        <p className="text-xs text-muted">
                          {pluralize(e.totalQuestions, 'questão', 'questões')} · {pluralize(e.subjects.filter((s) => s.name !== UNIDENTIFIED).length, 'disciplina', 'disciplinas')} · enviada {formatRelative(e.createdAt)}
                        </p>
                      </div>
                      <span className="hidden shrink-0 items-center gap-1 rounded-full bg-foreground/[0.05] px-2 py-0.5 text-[11px] font-semibold text-muted sm:inline-flex">
                        {e.method === 'ai' ? <Bot className="size-3" aria-hidden /> : <Wand2 className="size-3" aria-hidden />}
                        {e.method === 'ai' ? 'Claude' : 'Automático'}
                      </span>
                      <Button variant="ghost" size="icon-sm" className="hover:text-danger" onClick={() => setToDelete(e)} aria-label={`Excluir ${examLabel(e)}`}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
                {mine.some((e) => e.method === 'auto') && (
                  <p className="mt-3 text-xs text-muted">
                    Na análise automática, a disciplina vem dos títulos da prova e o assunto das palavras-chave do seu plano; questões sem correspondência aparecem como “{OTHER_TOPIC}” ou “{UNIDENTIFIED}”.
                  </p>
                )}
              </Card>
            </>
          )}
        </div>
      )}

      <Dialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogTitle>Excluir prova?</DialogTitle>
          <DialogDescription>Os números de “{toDelete && examLabel(toDelete)}” deixam de entrar nos resultados.</DialogDescription>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (toDelete) deleteExam.mutate(toDelete.id)
                if (filter === toDelete?.id) setFilter('all')
                toast('Prova excluída')
                setToDelete(null)
              }}
            >
              <Trash2 /> Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function examLabel(e: ExamAnalysis): string {
  const extra = [e.examBoard, e.year && !e.name.includes(String(e.year)) ? e.year : null].filter(Boolean).join(' · ')
  return extra ? `${e.name} (${extra})` : e.name
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-xl border border-border bg-surface px-3 py-1.5">
      <strong className="tabular-nums">{value.toLocaleString('pt-BR')}</strong> <span className="text-muted">{label}</span>
    </span>
  )
}

/** Barra horizontal de magnitude (uma só cor; o valor vem escrito ao lado). */
function Bar({ share, muted, label }: { share: number; muted?: boolean; label: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]" title={label}>
      <div className={cn('h-full rounded-full', muted ? 'bg-foreground/25' : 'bg-primary')} style={{ width: `${Math.max(2, Math.round(share * 100))}%` }} />
    </div>
  )
}

function SubjectRow({ subject: s }: { subject: AggregatedSubject }) {
  const muted = s.name === UNIDENTIFIED
  return (
    <tr className="group">
      <td className="py-2 pr-3 align-middle">
        {s.subjectId ? (
          <Link to={`/disciplina/${s.subjectId}`} className="font-medium hover:text-primary">
            {s.name}
          </Link>
        ) : (
          <span className={cn('font-medium', muted && 'text-muted')}>{s.name}</span>
        )}
        <div className="mt-1.5 sm:hidden">
          <Bar share={s.share} muted={muted} label={`${s.name}: ${s.questions} questões (${pct(s.share)})`} />
        </div>
      </td>
      <td className="hidden w-1/2 py-2 pr-3 align-middle sm:table-cell">
        <Bar share={s.share} muted={muted} label={`${s.name}: ${s.questions} questões (${pct(s.share)})`} />
      </td>
      <td className="w-px py-2 pr-3 text-right align-middle font-semibold whitespace-nowrap tabular-nums">{s.questions}</td>
      <td className="w-px py-2 text-right align-middle whitespace-nowrap text-muted tabular-nums">{pct(s.share)}</td>
    </tr>
  )
}

function TopicsCard({ subject: s, several }: { subject: AggregatedSubject; several: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const topics = expanded ? s.topics : s.topics.slice(0, 6)
  return (
    <Card className="p-5">
      <div className="flex items-baseline gap-2">
        <h3 className="min-w-0 flex-1 truncate font-bold">{s.name}</h3>
        <span className="shrink-0 text-xs text-muted tabular-nums">
          {pluralize(s.questions, 'questão', 'questões')} · {pct(s.share)} {several ? 'do total' : 'da prova'}
        </span>
      </div>
      <ol className="mt-3 space-y-2.5">
        {topics.map((t, i) => {
          const other = !t.topicId && t.name === OTHER_TOPIC
          return (
            <li key={t.topicId ?? t.name} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="w-5 shrink-0 text-xs font-bold text-subtle tabular-nums">{other ? '' : `${i + 1}.`}</span>
                {t.topicId ? (
                  <Link to={`/assunto/${t.topicId}`} className="min-w-0 flex-1 font-medium hover:text-primary">
                    {t.name}
                  </Link>
                ) : (
                  <span className={cn('min-w-0 flex-1', other ? 'text-muted' : 'font-medium')}>{t.name}</span>
                )}
                <span className="shrink-0 text-xs tabular-nums">
                  <strong>{t.count}</strong> <span className="text-muted">({pct(t.share)})</span>
                </span>
              </div>
              <div className="mt-1 pl-7">
                <Bar share={t.share} muted={other} label={`${t.name}: ${t.count} questões (${pct(t.share)} de ${s.name})`} />
              </div>
            </li>
          )
        })}
      </ol>
      {s.topics.length > 6 && (
        <Button variant="link" size="sm" className="mt-2 px-0" onClick={() => setExpanded((x) => !x)}>
          {expanded ? 'Mostrar menos' : `Ver todos os ${s.topics.length} assuntos`}
        </Button>
      )}
    </Card>
  )
}
