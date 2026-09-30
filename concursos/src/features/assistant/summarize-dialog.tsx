import { Loader2, Wand2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { aiSummarizePrompt, aiThemesSummaryPrompt, cleanAiHtml, filledThemes, hasNotes, notesAsText, quickSummary, themesAsText, themesQuickSummary } from '@/domain/assistant'
import { extractiveSummary } from '@/domain/book'
import type { Theme } from '@/domain/themes'
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
 * "Resumir conteúdo": o resumo geral do assunto para Meu resumo. Quando o
 * assunto tem temas, resume os temas e subtemas (um bloco por tema); senão,
 * as anotações ou o trecho do livro carregado.
 */
export function SummarizeDialog({
  open,
  onOpenChange,
  topic,
  content,
  themes = [],
  onInsert,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topic: TopicInfo
  content: SummaryContent
  /** Temas e subtemas do assunto */
  themes?: Theme[]
  onInsert: (html: string, mode: 'append' | 'replace') => void
}) {
  const { sample, disable } = useClaudeSample()
  const book = useLoadedBook()
  const [mode, setMode] = useState<AssistantMode>('ai')
  const [result, setResult] = useState('')
  const [busy, setBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const filled = filledThemes(themes)
  const byThemes = filled.length > 0
  const subCount = filled.reduce((n, t) => n + t.subthemes.length, 0)
  const notes = hasNotes(content)
  const fromBook = !byThemes && !notes ? bookExcerptFor(book, topic.topicName, topic.details) : null
  const source = byThemes
    ? `${filled.length} ${filled.length === 1 ? 'tema' : 'temas'}${subCount ? ` e ${subCount} ${subCount === 1 ? 'subtema' : 'subtemas'}` : ''}`
    : notes
      ? 'suas anotações'
      : fromBook
        ? `o livro (${fromBook.label})`
        : null
  const effective: AssistantMode = sample ? mode : 'auto'

  const generate = async () => {
    setResult('')
    if (effective === 'auto') {
      const html = byThemes
        ? themesQuickSummary(themes)
        : notes
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
      const info = { topic: topic.topicName, subject: topic.subjectName, position: topic.positionName }
      await sample!(
        byThemes ? aiThemesSummaryPrompt({ ...info, themes: themesAsText(themes) }) : aiSummarizePrompt({ ...info, notes: notes ? notesAsText(content) : fromBook!.text }),
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
        <DialogDescription>
          {byThemes
            ? `O resumo geral de “${topic.topicName}”, feito a partir dos temas e subtemas — organizado por tema, para Meu resumo.`
            : `Um resumo de revisão enxuto de “${topic.topicName}”, para ler antes da prova.`}
        </DialogDescription>

        <div className="mt-5 space-y-4">
          {!source ? (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
              Crie temas com resumo, escreva suas anotações ou use <strong>Preencher com livro (PDF)</strong> primeiro — o resumo é feito a partir desse conteúdo.
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
                aiHint={
                  byThemes
                    ? 'Um bloco por tema, com os subtemas e o essencial de cada um, só com o que você escreveu. Usa a sua cota do Claude.'
                    : 'Reescreve em tópicos curtos, só com o que está no material. Usa a sua cota do Claude.'
                }
                autoHint={
                  byThemes
                    ? 'Um bloco por tema, com as frases principais do tema, os pontos de atenção e cada subtema em negrito.'
                    : 'Lista os tópicos das anotações (títulos, listas e “Tema: explicação”).'
                }
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
              {/* Com temas, o resumo geral substitui Meu resumo (ele é o resumo dos temas) */}
              <Button variant={byThemes ? 'outline' : 'primary'} className={byThemes ? '' : 'order-last'} onClick={() => insert('append')}>
                Adicionar ao Meu resumo
              </Button>
              <Button variant={byThemes ? 'primary' : 'outline'} onClick={() => insert('replace')}>
                {byThemes ? 'Usar como Meu resumo' : 'Substituir Meu resumo'}
              </Button>
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
