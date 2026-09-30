import { BookOpenText, Lightbulb, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { aiExplainPrompt, cleanAiHtml, notesAsText } from '@/domain/assistant'
import { extractiveSummary } from '@/domain/book'
import type { SummaryContent } from '@/domain/types'
import { HIDE_CODES, sampleErrorMessage, useClaudeSample } from '@/features/ai/claude-sample'
import { useLoadedBook } from '@/features/book/book-store'
import { BookUpload } from '@/features/book/book-upload'
import { bookExcerptFor, HtmlPreview } from './shared'
import type { TopicInfo } from './summarize-dialog'

/**
 * "Explicar assunto": explicação didática pelo Claude (usando anotações,
 * subitens do edital e o livro carregado como contexto). Sem o Claude,
 * mostra o que o livro carregado diz sobre o assunto.
 */
export function ExplainDialog({
  open,
  onOpenChange,
  topic,
  content,
  onSaveToNotes,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic: TopicInfo
  content: SummaryContent
  onSaveToNotes: (html: string) => void
}) {
  const { sample, disable } = useClaudeSample()
  const book = useLoadedBook()
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const fromBook = bookExcerptFor(book, topic.topicName, topic.details)

  const explainWithAi = async () => {
    if (!sample) return
    abortRef.current = new AbortController()
    setBusy(true)
    setResult('')
    try {
      const r = await sample(
        aiExplainPrompt({
          topic: topic.topicName,
          subject: topic.subjectName,
          position: topic.positionName,
          notes: notesAsText(content),
          details: topic.details,
          bookExcerpt: fromBook?.text,
        }),
        { modelTier: 'default', signal: abortRef.current.signal, onText: ({ text }) => setResult(cleanAiHtml(text)) },
      )
      setResult(cleanAiHtml(r.text))
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

  const showBook = () => {
    if (!fromBook || !book) return
    const html = extractiveSummary({ topicName: topic.topicName, bookName: book.name, excerpt: fromBook.excerpt, details: topic.details })
    setResult(`${html.summary}${html.keyPoints}<p><em>Fonte: ${fromBook.label}</em></p>`)
  }

  const save = () => {
    onSaveToNotes(`<h3>Explicação</h3>${result}`)
    toast.success('Explicação adicionada às Observações', { description: 'Revise e clique em Salvar.' })
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) abortRef.current?.abort()
        if (next) setResult('')
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogTitle className="flex items-center gap-2">
          <Lightbulb className="size-5 text-primary" /> Explicar assunto
        </DialogTitle>
        <DialogDescription>
          {topic.topicName} · {topic.subjectName}
        </DialogDescription>

        <div className="mt-5 space-y-4">
          {!result && (
            <>
              {sample ? (
                <p className="text-sm text-muted">
                  O Claude explica o assunto de forma didática, com exemplos e como costuma cair na prova
                  {fromBook ? ` — usando também o seu livro (${fromBook.label})` : ''}. Usa a sua cota do Claude.
                </p>
              ) : (
                <p className="rounded-xl bg-foreground/[0.04] px-4 py-3 text-sm text-muted">
                  A explicação escrita pelo Claude está disponível na página publicada no claude.ai. Aqui você pode ver o que o seu livro diz sobre o assunto.
                </p>
              )}
              {!fromBook && !sample && <BookUpload id="explain-book-file" />}
              {book && !fromBook && <p className="text-sm text-muted">O livro carregado não parece tratar de “{topic.topicName}”.</p>}
            </>
          )}
          {result && <HtmlPreview html={result} className="max-h-[50dvh] overflow-y-auto" />}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {busy && (
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Parar
            </Button>
          )}
          {result && !busy && <Button variant="outline" onClick={save}>Salvar em Observações</Button>}
          {!busy && fromBook && (
            <Button variant={sample ? 'ghost' : 'primary'} onClick={showBook}>
              <BookOpenText /> O que o livro diz
            </Button>
          )}
          {sample && (
            <Button onClick={explainWithAi} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Lightbulb />} {busy ? 'Claude explicando…' : result ? 'Explicar de novo' : 'Explicar com o Claude'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
