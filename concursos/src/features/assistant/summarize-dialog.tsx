import { Loader2, Wand2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { aiSummarizePrompt, cleanAiHtml, hasNotes, notesAsText, quickSummary } from '@/domain/assistant'
import { extractiveSummary } from '@/domain/book'
import type { SummaryContent } from '@/domain/types'
import { HIDE_CODES, sampleErrorMessage, useClaudeSample } from '@/features/ai/claude-sample'
import { useLoadedBook } from '@/features/book/book-store'
import { bookExcerptFor, HtmlPreview, ModePicker, type AssistantMode } from './shared'

export interface TopicInfo {
  topicName: string
  subjectName: string
  positionName: string
  details: string[]
}

/**
 * "Resumir conteúdo": um resumo de revisão enxuto das anotações (ou do
 * trecho do livro carregado), para inserir em Meu resumo.
 */
export function SummarizeDialog({
  open,
  onOpenChange,
  topic,
  content,
  onInsert,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic: TopicInfo
  content: SummaryContent
  onInsert: (html: string, mode: 'append' | 'replace') => void
}) {
  const { sample, disable } = useClaudeSample()
  const book = useLoadedBook()
  const [mode, setMode] = useState<AssistantMode>('ai')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const notes = hasNotes(content)
  const fromBook = !notes ? bookExcerptFor(book, topic.topicName, topic.details) : null
  const source = notes ? 'suas anotações' : fromBook ? `o livro (${fromBook.label})` : null
  const effective: AssistantMode = sample ? mode : 'auto'

  const generate = async () => {
    setResult('')
    if (effective === 'auto') {
      const html = notes
        ? quickSummary(topic.topicName, content)
        : fromBook
          ? extractiveSummary({ topicName: topic.topicName, bookName: book!.name, excerpt: fromBook.excerpt, details: topic.details }).summary
          : ''
      if (!html) toast('Nada para resumir', { description: 'Use títulos, listas e “Tema: explicação” nas anotações.' })
      setResult(html)
      return
    }
    abortRef.current = new AbortController()
    setBusy(true)
    try {
      await sample!(
        aiSummarizePrompt({ topic: topic.topicName, subject: topic.subjectName, position: topic.positionName, notes: notes ? notesAsText(content) : fromBook!.text }),
        { modelTier: 'default', signal: abortRef.current.signal, onText: ({ text }) => setResult(cleanAiHtml(text)) },
      ).then((r) => setResult(cleanAiHtml(r.text)))
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

  const insert = (m: 'append' | 'replace') => {
    onInsert(result, m)
    toast.success('Resumo inserido em Meu resumo', { description: 'Revise e clique em Salvar.' })
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
          <Wand2 className="size-5 text-primary" /> Resumir conteúdo
        </DialogTitle>
        <DialogDescription>Um resumo de revisão enxuto de “{topic.topicName}”, para ler antes da prova.</DialogDescription>

        <div className="mt-5 space-y-4">
          {!source ? (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
              Escreva suas anotações ou use <strong>Preencher com livro (PDF)</strong> primeiro — o resumo é feito a partir desse conteúdo.
            </p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Fonte: <strong className="text-foreground">{source}</strong>
              </p>
              <ModePicker
                mode={mode}
                onChange={setMode}
                aiAvailable={!!sample}
                disabled={busy}
                aiHint="Reescreve em tópicos curtos, só com o que está no material. Usa a sua cota do Claude."
                autoHint="Lista os tópicos das anotações (títulos, listas e “Tema: explicação”)."
              />
              {result && <HtmlPreview html={result} className="max-h-[45dvh] overflow-y-auto" />}
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          {busy && (
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Parar
            </Button>
          )}
          {result && !busy ? (
            <>
              <Button variant="ghost" onClick={generate}>
                Gerar de novo
              </Button>
              <Button variant="outline" onClick={() => insert('replace')}>
                Substituir Meu resumo
              </Button>
              <Button onClick={() => insert('append')}>Adicionar ao Meu resumo</Button>
            </>
          ) : (
            <Button onClick={generate} disabled={!source || busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Wand2 />} {busy ? 'Claude escrevendo…' : 'Resumir'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
