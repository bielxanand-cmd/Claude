import { Check, FileQuestion, Loader2, RotateCcw, Sparkles, Wand2, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useQuizzes, useSaveQuiz } from '@/data/queries'
import { hasNotes, notesAsText } from '@/domain/assistant'
import { extractiveSummary } from '@/domain/book'
import { aiQuestionsPrompt, answerQuestion, generateTrueFalse, parseAiQuestions, type Quiz, type QuestionStyle } from '@/domain/questions'
import type { SummaryContent } from '@/domain/types'
import { HIDE_CODES, sampleErrorMessage, useClaudeSample } from '@/features/ai/claude-sample'
import { useLoadedBook } from '@/features/book/book-store'
import { uuid } from '@/lib/storage'
import { percent } from '@/lib/text'
import { cn } from '@/lib/utils'
import { bookExcerptFor, ModePicker, type AssistantMode } from './shared'
import type { TopicInfo } from './summarize-dialog'

const LETTERS = 'ABCDE'

/**
 * "Criar questões": gera questões do assunto (Certo/Errado automático, ou
 * Certo/Errado e múltipla escolha com o Claude), corrige na hora e guarda o
 * desempenho do assunto.
 */
export function QuestionsDialog({
  open,
  onOpenChange,
  topicId,
  topic,
  content,
  examBoard,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: string
  topic: TopicInfo
  content: SummaryContent
  examBoard: string | null
}) {
  const quizzes = useQuizzes()
  const saveQuiz = useSaveQuiz()
  const { sample, disable } = useClaudeSample()
  const book = useLoadedBook()
  const quiz = useMemo(() => (quizzes.data ?? []).find((q) => q.topicId === topicId) ?? null, [quizzes.data, topicId])
  const [mode, setMode] = useState<AssistantMode>('ai')
  const [style, setStyle] = useState<QuestionStyle>('true_false')
  const [count, setCount] = useState(10)
  const [busy, setBusy] = useState(false)
  const [configuring, setConfiguring] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const notes = hasNotes(content)
  const fromBook = bookExcerptFor(book, topic.topicName, topic.details)
  const effective: AssistantMode = sample ? mode : 'auto'
  const canGenerate = effective === 'ai' ? notes || !!fromBook : notes || !!fromBook

  const save = (next: Quiz) => saveQuiz.mutate({ topicId, quiz: next }, { onError: () => toast.error('Não foi possível salvar as respostas.') })

  const generate = async () => {
    // Placar do assunto continua acumulando entre gerações
    const history = { answered: quiz?.answered ?? 0, correct: quiz?.correct ?? 0 }
    if (effective === 'auto') {
      const source = notes
        ? content
        : extractiveSummary({ topicName: topic.topicName, bookName: book?.name ?? '', excerpt: fromBook!.excerpt, details: topic.details })
      const questions = generateTrueFalse(topicId, source, uuid, count)
      if (questions.length === 0) {
        toast('Poucas afirmações para gerar questões', { description: 'Escreva frases completas nas anotações ou use o livro.' })
        return
      }
      save({ topicId, source: 'auto', style: 'true_false', generatedAt: new Date().toISOString(), questions, ...history })
      setConfiguring(false)
      return
    }
    abortRef.current = new AbortController()
    setBusy(true)
    try {
      const material = [notes ? notesAsText(content) : '', fromBook ? `Trecho do livro (${fromBook.label}):\n${fromBook.text}` : ''].filter(Boolean).join('\n\n')
      const value = await sample!.json(
        aiQuestionsPrompt({ topic: topic.topicName, subject: topic.subjectName, position: topic.positionName, examBoard, notes: material, style, count }),
        { modelTier: 'default', signal: abortRef.current.signal },
      )
      const questions = parseAiQuestions(value, style, uuid)
      if (questions.length === 0) {
        toast.error('O Claude não gerou questões válidas. Tente de novo.')
        return
      }
      save({ topicId, source: 'ai', style, generatedAt: new Date().toISOString(), questions, ...history })
      setConfiguring(false)
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

  const answer = (questionId: string, chosen: number) => quiz && save(answerQuestion(quiz, questionId, chosen))

  const round = quiz?.questions ?? []
  const roundAnswered = round.filter((q) => q.chosen !== null)
  const roundCorrect = roundAnswered.filter((q) => q.chosen === q.answer).length
  const showConfig = !quiz || configuring

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) abortRef.current?.abort()
        if (next) setConfiguring(false)
        onOpenChange(next)
      }}
    >
      <DialogContent className="flex max-h-[calc(100dvh-1.5rem)] max-w-3xl flex-col gap-0 p-0">
        <div className="border-b border-border px-6 py-5 pr-14">
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="size-5 text-primary" /> Questões
          </DialogTitle>
          <DialogDescription>
            {topic.topicName}
            {quiz && quiz.answered > 0 && (
              <>
                {' '}
                · desempenho no assunto: <strong className="text-foreground">{quiz.correct}</strong> de {quiz.answered} ({percent(quiz.correct / quiz.answered)})
              </>
            )}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {showConfig ? (
            !canGenerate ? (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
                Escreva suas anotações ou use <strong>Preencher com livro (PDF)</strong> primeiro — as questões são criadas a partir desse conteúdo.
              </p>
            ) : (
              <>
                <ModePicker
                  mode={mode}
                  onChange={setMode}
                  aiAvailable={!!sample}
                  disabled={busy}
                  aiHint="Questões no estilo das bancas, com gabarito comentado. Usa a sua cota do Claude."
                  autoHint="Itens de Certo/Errado com as suas frases: parte como está, parte alterada (número trocado, sentido invertido)."
                />
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {effective === 'ai' && (
                    <fieldset className="flex items-center gap-3">
                      <legend className="sr-only">Tipo</legend>
                      {(
                        [
                          ['true_false', 'Certo ou errado'],
                          ['multiple_choice', 'Múltipla escolha (A–E)'],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value} className="flex items-center gap-1.5">
                          <input type="radio" name="q-style" checked={style === value} onChange={() => setStyle(value)} className="accent-[var(--primary)]" />
                          {label}
                        </label>
                      ))}
                    </fieldset>
                  )}
                  <label className="flex items-center gap-2">
                    Quantidade
                    <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-surface px-2">
                      {[5, 10, 15].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {effective === 'auto' && (
                  <p className="text-xs text-muted">As questões automáticas conferem se você lembra do que anotou; confira o gabarito com o seu material.</p>
                )}
              </>
            )
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-foreground/[0.03] px-4 py-3 text-sm">
                <span className="flex-1">
                  {roundAnswered.length} de {round.length} respondidas · <strong>{roundCorrect}</strong> acertos
                  <span className="ml-2 text-xs text-muted">({quiz!.source === 'ai' ? 'geradas pelo Claude' : 'geradas automaticamente'})</span>
                </span>
              </div>
              <ol className="space-y-4">
                {round.map((q, i) => {
                  const answered = q.chosen !== null
                  const right = answered && q.chosen === q.answer
                  return (
                    <li key={q.id} className="rounded-2xl border border-border p-4">
                      <p className="text-sm font-semibold leading-relaxed">
                        <span className="mr-2 text-muted">{i + 1}.</span>
                        {q.statement}
                      </p>
                      <div className={cn('mt-3 gap-2', q.style === 'true_false' ? 'grid grid-cols-2 sm:flex' : 'grid')}>
                        {q.options.map((opt, idx) => {
                          const isAnswer = idx === q.answer
                          const isChosen = idx === q.chosen
                          return (
                            <button
                              key={idx}
                              type="button"
                              disabled={answered}
                              onClick={() => answer(q.id, idx)}
                              className={cn(
                                'flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm transition',
                                !answered && 'hover:border-primary/50 hover:bg-primary-tint/40',
                                answered && isAnswer && 'border-success bg-success-tint font-semibold',
                                answered && isChosen && !isAnswer && 'border-danger bg-danger-tint',
                                answered && !isAnswer && !isChosen && 'opacity-60',
                              )}
                            >
                              {q.style === 'multiple_choice' && <span className="font-bold text-muted">{LETTERS[idx]})</span>}
                              <span className="flex-1">{opt}</span>
                              {answered && isAnswer && <Check className="size-4 shrink-0 text-success-strong" aria-label="Correta" />}
                              {answered && isChosen && !isAnswer && <X className="size-4 shrink-0 text-danger" aria-label="Sua resposta" />}
                            </button>
                          )
                        })}
                      </div>
                      {answered && (
                        <p className={cn('mt-3 rounded-lg px-3 py-2 text-sm', right ? 'bg-success-tint' : 'bg-danger-tint')} role="status">
                          <strong>{right ? 'Você acertou.' : 'Você errou.'}</strong> {q.explanation}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ol>
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          {busy && (
            <Button variant="ghost" onClick={() => abortRef.current?.abort()}>
              Parar
            </Button>
          )}
          {showConfig ? (
            <>
              {quiz && (
                <Button variant="ghost" onClick={() => setConfiguring(false)} disabled={busy}>
                  Voltar às questões
                </Button>
              )}
              <Button onClick={generate} disabled={!canGenerate || busy}>
                {busy ? <Loader2 className="animate-spin" /> : effective === 'ai' ? <Sparkles /> : <Wand2 />}
                {busy ? 'Claude elaborando…' : 'Gerar questões'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setConfiguring(true)}>
              <RotateCcw /> Novas questões
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
