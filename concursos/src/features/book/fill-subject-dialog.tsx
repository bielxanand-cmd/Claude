import { BookOpenText, Check, CircleSlash, Loader2, Sparkles, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useSaveSummary, type Study } from '@/data/queries'
import { findRelevantPages, mergeSummary, pageRangeLabel } from '@/domain/book'
import type { PlanSubject } from '@/domain/types'
import { HIDE_CODES, sampleErrorMessage, useClaudeSample } from '@/features/ai/claude-sample'
import { htmlToText } from '@/lib/text'
import { cn } from '@/lib/utils'
import { useLoadedBook } from './book-store'
import { BookUpload } from './book-upload'
import { contentFromBook, type FillMode } from './generate'

type RowState = 'idle' | 'running' | 'done' | 'error' | 'skipped'

const EMPTY = { summary: '', keyPoints: '', pitfalls: '', notes: '' }

/**
 * Preenche os resumos de vários assuntos de uma disciplina a partir de um
 * livro em PDF. Por padrão, só assuntos sem resumo; os que já têm recebem o
 * conteúdo ao final, se marcados.
 */
export function FillSubjectDialog({ open, onOpenChange, subject, study }: { open: boolean; onOpenChange: (open: boolean) => void; subject: PlanSubject; study: Study }) {
  const book = useLoadedBook()
  const { sample, disable } = useClaudeSample()
  const saveSummary = useSaveSummary()
  const [mode, setMode] = useState<FillMode>('ai')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [states, setStates] = useState<Record<string, RowState>>({})
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const rows = useMemo(
    () =>
      subject.topics.map((pt) => {
        const summary = study.summaryIndex.get(pt.topic.id)
        return {
          planTopic: pt,
          hasSummary: !!summary && Object.values(summary.content).some((h) => htmlToText(h).length > 0),
          excerpt: book ? findRelevantPages(book.pages, pt.topic.name, pt.details) : null,
        }
      }),
    [book, subject, study.summaryIndex],
  )

  // Seleção padrão: assuntos encontrados no livro e ainda sem resumo
  useEffect(() => {
    setSelected(new Set(rows.filter((r) => r.excerpt && !r.hasSummary).map((r) => r.planTopic.topic.id)))
    setStates({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, open])

  const effectiveMode: FillMode = sample ? mode : 'extract'
  const queue = rows.filter((r) => selected.has(r.planTopic.topic.id) && r.excerpt)
  const finished = Object.values(states).filter((s) => s === 'done' || s === 'error').length

  const run = async () => {
    if (!book) return
    abortRef.current = new AbortController()
    setRunning(true)
    let ok = 0
    for (const row of queue) {
      const id = row.planTopic.topic.id
      if (abortRef.current.signal.aborted) break
      setStates((s) => ({ ...s, [id]: 'running' }))
      try {
        const content = await contentFromBook({
          mode: effectiveMode,
          bookName: book.name,
          topicName: row.planTopic.topic.name,
          subjectName: subject.subject.name,
          positionName: study.plan?.position.name ?? '',
          details: row.planTopic.details,
          excerpt: row.excerpt!,
          sample,
          signal: abortRef.current.signal,
        })
        const current = study.summaryIndex.get(id)?.content ?? EMPTY
        await saveSummary.mutateAsync({ topicId: id, content: mergeSummary(current, content, 'append') })
        setStates((s) => ({ ...s, [id]: 'done' }))
        ok++
      } catch (e) {
        const code = (e as { code?: string })?.code
        setStates((s) => ({ ...s, [id]: code === 'cancelled' ? 'idle' : 'error' }))
        if (code === 'cancelled') break
        if (code && HIDE_CODES.has(code)) {
          disable()
          toast.error(sampleErrorMessage(e))
          break
        }
        if (code === 'rate_limited') {
          toast.error(sampleErrorMessage(e))
          break
        }
      }
    }
    setRunning(false)
    abortRef.current = null
    if (ok > 0) toast.success(`${ok} ${ok === 1 ? 'resumo preenchido' : 'resumos preenchidos'}`, { description: 'Revise cada assunto e ajuste com suas palavras.' })
  }

  const toggle = (id: string, checked: boolean) =>
    setSelected((s) => {
      const next = new Set(s)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })

  const found = rows.filter((r) => r.excerpt).length

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) abortRef.current?.abort()
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-3xl flex-col gap-0 p-0">
        <div className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <BookOpenText className="size-5 text-primary" /> Preencher resumos com livro (PDF)
          </DialogTitle>
          <DialogDescription>
            {subject.subject.name}: envie o livro da disciplina e escolha os assuntos. O app encontra as páginas de cada um e preenche os campos do resumo.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <BookUpload id="subject-book-file" />

          {book && (
            <>
              {sample && (
                <div role="radiogroup" aria-label="Como preencher" className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['ai', 'Resumo com o Claude', 'Um resumo escrito para cada assunto, só com o texto do livro. Usa a sua cota do Claude.'],
                      ['extract', 'Trechos do livro', 'As frases mais relevantes de cada assunto, sem IA.'],
                    ] as const
                  ).map(([value, title, hint]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={mode === value}
                      disabled={running}
                      onClick={() => setMode(value)}
                      className={cn(
                        'rounded-xl border p-3 text-left transition',
                        mode === value ? 'border-primary bg-primary-tint ring-4 ring-ring/15' : 'border-border hover:border-border-strong',
                      )}
                    >
                      <span className="flex items-center gap-1.5 text-sm font-semibold">
                        {value === 'ai' && <Sparkles className="size-3.5 text-primary" />} {title}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">{hint}</span>
                    </button>
                  ))}
                </div>
              )}

              <section aria-labelledby="book-topics">
                <h3 id="book-topics" className="mb-2 text-sm font-bold">
                  Assuntos ({found} de {rows.length} encontrados no livro)
                </h3>
                <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
                  {rows.map(({ planTopic, hasSummary, excerpt }) => {
                    const id = planTopic.topic.id
                    const state = states[id] ?? 'idle'
                    return (
                      <li key={id} className={cn('flex items-center gap-3 px-4 py-2.5', !excerpt && 'opacity-60')}>
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          disabled={!excerpt || running}
                          onChange={(e) => toggle(id, e.target.checked)}
                          aria-label={`Preencher ${planTopic.topic.name}`}
                          className="size-4 shrink-0 accent-[var(--primary)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{planTopic.topic.name}</span>
                          <span className="block text-xs text-muted">
                            {excerpt ? pageRangeLabel(excerpt) : 'não encontrado no livro'}
                            {hasSummary && ' · já tem resumo (o conteúdo do livro vai para o final)'}
                          </span>
                        </span>
                        <span className="shrink-0" aria-live="polite">
                          {state === 'running' && <Loader2 className="size-4 animate-spin text-primary" aria-label="Preenchendo" />}
                          {state === 'done' && <Check className="size-4 text-success" aria-label="Preenchido" />}
                          {state === 'error' && <TriangleAlert className="size-4 text-danger" aria-label="Falhou" />}
                          {!excerpt && <CircleSlash className="size-4 text-subtle" aria-hidden />}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            </>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center">
          {running || finished > 0 ? (
            <div className="flex-1">
              <ProgressBar value={queue.length ? finished / queue.length : 0} size="sm" label="Progresso do preenchimento" />
              <p className="mt-1 text-xs text-muted">
                {finished} de {queue.length} assuntos
                {effectiveMode === 'ai' && running && ' · o Claude leva de 10 a 60 s por assunto'}
              </p>
            </div>
          ) : (
            <p className="flex-1 text-xs text-muted">{book ? `${queue.length} assuntos selecionados` : 'Envie o PDF para começar.'}</p>
          )}
          {running ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              Parar
            </Button>
          ) : (
            <Button onClick={run} disabled={!book || queue.length === 0}>
              {effectiveMode === 'ai' ? <Sparkles /> : <BookOpenText />} Preencher {queue.length} {queue.length === 1 ? 'assunto' : 'assuntos'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
