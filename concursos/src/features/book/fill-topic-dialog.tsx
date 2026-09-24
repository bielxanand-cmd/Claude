import { BookOpenText, FileSearch, Loader2, Sparkles } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import { findRelevantPages, mergeSummary, pageRangeLabel, type RelevantExcerpt } from '@/domain/book'
import type { SummaryContent } from '@/domain/types'
import { HIDE_CODES, sampleErrorMessage, useClaudeSample } from '@/features/ai/claude-sample'
import { htmlToText } from '@/lib/text'
import { cn } from '@/lib/utils'
import { useLoadedBook } from './book-store'
import { BookUpload } from './book-upload'
import { contentFromBook, type FillMode } from './generate'

/**
 * Preenche os campos do resumo de um assunto a partir de um livro em PDF.
 * O resultado vai para o editor (não é salvo automaticamente), para revisão.
 */
export function FillTopicDialog({
  open,
  onOpenChange,
  topicName,
  subjectName,
  positionName,
  details,
  current,
  onFill,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicName: string
  subjectName: string
  positionName: string
  details: string[]
  current: SummaryContent
  onFill: (content: SummaryContent) => void
}) {
  const book = useLoadedBook()
  const { sample, disable } = useClaudeSample()
  const [mode, setMode] = useState<FillMode>('ai')
  const [merge, setMerge] = useState<'append' | 'replace'>('append')
  const [manual, setManual] = useState<{ from: string; to: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const found = useMemo(() => (book ? findRelevantPages(book.pages, topicName, details) : null), [book, topicName, details])
  const excerpt: RelevantExcerpt | null = useMemo(() => {
    if (!book) return null
    if (manual) {
      const from = Math.max(1, Number(manual.from) || 1)
      const to = Math.min(book.pages.length, Math.max(from, Number(manual.to) || from))
      const pages = book.pages.slice(from - 1, to)
      return pages.length ? { pages, firstPage: from, lastPage: to, score: 0 } : null
    }
    return found
  }, [book, found, manual])

  const effectiveMode: FillMode = sample ? mode : 'extract'
  const hasContent = Object.values(current).some((html) => htmlToText(html).length > 0)
  const preview = excerpt?.pages.map((p) => p.text).join(' ').slice(0, 420)

  const run = async () => {
    if (!book || !excerpt) return
    abortRef.current = new AbortController()
    setBusy(true)
    try {
      const content = await contentFromBook({
        mode: effectiveMode,
        bookName: book.name,
        topicName,
        subjectName,
        positionName,
        details,
        excerpt,
        sample,
        signal: abortRef.current.signal,
      })
      onFill(mergeSummary(current, content, hasContent ? merge : 'replace'))
      toast.success('Campos preenchidos', { description: 'Revise o texto e clique em Salvar.' })
      onOpenChange(false)
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === 'cancelled') return
      if (code && HIDE_CODES.has(code)) disable()
      toast.error(sampleErrorMessage(e))
    } finally {
      setBusy(false)
      abortRef.current = null
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) abortRef.current?.abort()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <BookOpenText className="size-5 text-primary" /> Preencher com livro (PDF)
        </DialogTitle>
        <DialogDescription>
          Envie um livro ou apostila. O app encontra as páginas sobre “{topicName}” e preenche Meu resumo, Pontos importantes, Pegadinhas e Observações.
        </DialogDescription>

        <div className="mt-5 space-y-5">
          <BookUpload id="topic-book-file" />

          {book && (
            <section aria-label="Trecho encontrado" className="rounded-xl border border-border p-4">
              {excerpt ? (
                <>
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <FileSearch className="size-4 text-primary" aria-hidden />
                    {manual ? 'Páginas escolhidas' : 'Encontrado'}: {pageRangeLabel(excerpt)}
                  </p>
                  <p className="mt-2 line-clamp-4 text-sm text-muted">{preview}…</p>
                </>
              ) : (
                <p className="text-sm">
                  <strong>Não encontramos “{topicName}” neste livro.</strong> <span className="text-muted">Informe as páginas abaixo.</span>
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <div>
                  <Label htmlFor="pg-from" className="text-xs">
                    Usar páginas de
                  </Label>
                  <Input
                    id="pg-from"
                    type="number"
                    min={1}
                    max={book.pages.length}
                    value={manual?.from ?? excerpt?.firstPage ?? ''}
                    onChange={(e) => setManual({ from: e.target.value, to: manual?.to ?? String(excerpt?.lastPage ?? e.target.value) })}
                    className="h-9 w-24"
                  />
                </div>
                <div>
                  <Label htmlFor="pg-to" className="text-xs">
                    até
                  </Label>
                  <Input
                    id="pg-to"
                    type="number"
                    min={1}
                    max={book.pages.length}
                    value={manual?.to ?? excerpt?.lastPage ?? ''}
                    onChange={(e) => setManual({ from: manual?.from ?? String(excerpt?.firstPage ?? 1), to: e.target.value })}
                    className="h-9 w-24"
                  />
                </div>
                {manual && found && (
                  <Button variant="ghost" size="sm" onClick={() => setManual(null)}>
                    Voltar ao encontrado
                  </Button>
                )}
              </div>
            </section>
          )}

          {book && excerpt && (
            <>
              {sample && (
                <div role="radiogroup" aria-label="Como preencher" className="grid gap-2 sm:grid-cols-2">
                  {(
                    [
                      ['ai', 'Resumo com o Claude', 'Escreve resumo, pontos e pegadinhas usando só o trecho do livro. Usa a sua cota do Claude.'],
                      ['extract', 'Trechos do livro', 'Copia as frases mais relevantes do livro, sem IA. Prazos e artigos em negrito.'],
                    ] as const
                  ).map(([value, title, hint]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={mode === value}
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

              {hasContent && (
                <fieldset className="flex flex-wrap items-center gap-4 text-sm">
                  <legend className="mb-2 text-xs font-semibold text-muted">Os campos já têm texto:</legend>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="merge" checked={merge === 'append'} onChange={() => setMerge('append')} className="accent-[var(--primary)]" />
                    Adicionar ao final
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="merge" checked={merge === 'replace'} onChange={() => setMerge('replace')} className="accent-[var(--primary)]" />
                    Substituir
                  </label>
                </fieldset>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {busy && (
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Parar
            </Button>
          )}
          <Button onClick={run} disabled={!book || !excerpt || busy}>
            {busy ? <Loader2 className="animate-spin" /> : effectiveMode === 'ai' ? <Sparkles /> : <BookOpenText />}
            {busy ? (effectiveMode === 'ai' ? 'Claude escrevendo…' : 'Preenchendo…') : 'Preencher campos'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
