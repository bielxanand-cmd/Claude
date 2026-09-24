import { Check, PartyPopper, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { ProgressBar } from '@/components/ui/progress-bar'
import { useFlashcards, useSaveTopicFlashcards } from '@/data/queries'
import { fillCloze, KIND_LABEL, nextIntervalLabel, schedule, type Flashcard, type Rating } from '@/domain/flashcards'
import { cn } from '@/lib/utils'

const RATINGS: { rating: Rating; label: string; key: string; className: string }[] = [
  { rating: 'again', label: 'Errei', key: '1', className: 'border-danger/40 text-danger hover:bg-danger-tint' },
  { rating: 'hard', label: 'Difícil', key: '2', className: 'border-warning/50 text-[#b45309] hover:bg-warning-tint dark:text-warning' },
  { rating: 'good', label: 'Acertei', key: '3', className: 'border-success/50 text-success-strong hover:bg-success-tint' },
  { rating: 'easy', label: 'Fácil', key: '4', className: 'border-primary/40 text-primary hover:bg-primary-tint dark:text-primary-soft' },
]

/**
 * Sessão de revisão: mostra a pergunta, revela a resposta e agenda a próxima
 * revisão conforme a resposta. Cartões marcados como "Errei" voltam ao fim
 * da fila na mesma sessão.
 */
export function StudySession({
  open,
  onOpenChange,
  cards,
  title,
  topicNames,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Cartões a estudar, na ordem da fila */
  cards: Flashcard[]
  title: string
  /** Nome do assunto de cada cartão (para sessões de uma disciplina inteira) */
  topicNames?: Map<string, string>
}) {
  const all = useFlashcards()
  const save = useSaveTopicFlashcards()
  const [queue, setQueue] = useState<string[]>([])
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [stats, setStats] = useState<Record<Rating, number>>({ again: 0, hard: 0, good: 0, easy: 0 })

  // Nova sessão a cada abertura
  useEffect(() => {
    if (!open) return
    setQueue(cards.map((c) => c.id))
    setIndex(0)
    setFlipped(false)
    setStats({ again: 0, hard: 0, good: 0, easy: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const byId = useMemo(() => new Map((all.data ?? cards).map((c) => [c.id, c])), [all.data, cards])
  const card = byId.get(queue[index] ?? '')
  const done = open && queue.length > 0 && index >= queue.length
  const reviewed = stats.again + stats.hard + stats.good + stats.easy

  const rate = (rating: Rating) => {
    if (!card) return
    const updated: Flashcard = { ...card, review: schedule(card.review, rating) }
    const deck = (all.data ?? []).filter((c) => c.topicId === card.topicId).map((c) => (c.id === card.id ? updated : c))
    save.mutate({ topicId: card.topicId, cards: deck }, { onError: () => toast.error('Não foi possível salvar a revisão.') })
    setStats((s) => ({ ...s, [rating]: s[rating] + 1 }))
    if (rating === 'again') setQueue((q) => [...q, card.id])
    setIndex((i) => i + 1)
    setFlipped(false)
  }

  // Atalhos: espaço/enter vira; 1–4 respondem
  useEffect(() => {
    if (!open || done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (flipped) {
        const r = RATINGS.find((x) => x.key === e.key)
        if (r) rate(r.rating)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>
          {done ? 'Sessão concluída.' : `Cartão ${Math.min(index + 1, queue.length)} de ${queue.length} · espaço vira o cartão, 1–4 respondem`}
        </DialogDescription>
        <ProgressBar value={queue.length ? Math.min(index, queue.length) / queue.length : 0} size="sm" className="mt-4" label="Progresso da sessão" />

        {done ? (
          <div className="py-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-tint text-success-strong animate-pop">
              <PartyPopper className="size-7" aria-hidden />
            </span>
            <p className="mt-4 text-lg font-bold">
              {reviewed} {reviewed === 1 ? 'revisão feita' : 'revisões feitas'}
            </p>
            <div className="mx-auto mt-4 grid max-w-sm grid-cols-4 gap-2 text-center">
              {RATINGS.map(({ rating, label }) => (
                <div key={rating} className="rounded-xl bg-foreground/[0.04] py-2">
                  <p className="text-lg font-extrabold tabular-nums">{stats[rating]}</p>
                  <p className="text-[11px] font-semibold text-muted">{label}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">Os cartões voltam para revisão nos intervalos certos — confira a disciplina nos próximos dias.</p>
            <Button className="mt-6" onClick={() => onOpenChange(false)}>
              <Check /> Concluir
            </Button>
          </div>
        ) : card ? (
          <>
            <button
              type="button"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? 'Mostrar a pergunta' : 'Mostrar a resposta'}
              className="group mt-5 block w-full text-left [perspective:1600px]"
            >
              <div
                className={cn(
                  'relative min-h-64 transition-transform duration-500 [transform-style:preserve-3d] motion-reduce:transition-none',
                  flipped && '[transform:rotateY(180deg)]',
                )}
              >
                <CardFace card={card} side="front" topicName={topicNames?.get(card.topicId)} />
                <CardFace card={card} side="back" topicName={topicNames?.get(card.topicId)} />
              </div>
            </button>

            {flipped ? (
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Como foi?">
                {RATINGS.map(({ rating, label, key, className }) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => rate(rating)}
                    className={cn('flex flex-col items-center rounded-xl border bg-surface px-3 py-2.5 text-sm font-bold transition', className)}
                  >
                    {label}
                    <span className="text-[11px] font-medium text-muted">
                      {nextIntervalLabel(card.review, rating)} · {key}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <Button size="lg" variant="secondary" className="mt-5 w-full" onClick={() => setFlipped(true)}>
                <RotateCcw /> Mostrar resposta
              </Button>
            )}
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CardFace({ card, side, topicName }: { card: Flashcard; side: 'front' | 'back'; topicName?: string }) {
  const front = side === 'front'
  return (
    <div
      className={cn(
        'absolute inset-0 flex flex-col overflow-y-auto rounded-2xl border p-6 [backface-visibility:hidden] sm:p-8',
        front ? 'border-border bg-surface shadow-lift' : 'border-primary/30 bg-primary-tint [transform:rotateY(180deg)]',
      )}
      aria-hidden={false}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5">{front ? KIND_LABEL[card.kind] : 'Resposta'}</span>
        {(topicName || card.context) && <span className="truncate">{[topicName, card.context].filter(Boolean).join(' · ')}</span>}
      </div>
      <div className="grid flex-1 place-items-center py-6">
        {front ? (
          <p className="whitespace-pre-line text-center text-xl font-bold leading-relaxed sm:text-2xl">
            {card.kind === 'truefalse' ? `${card.front}?` : card.front}
          </p>
        ) : card.kind === 'cloze' ? (
          <p className="text-center text-lg font-semibold leading-relaxed sm:text-xl">
            {fillCloze(card).map((part, i) =>
              part.filled ? (
                <mark key={i} className="rounded bg-primary px-1 text-white">
                  {part.text}
                </mark>
              ) : (
                <span key={i}>{part.text}</span>
              ),
            )}
          </p>
        ) : (
          <div className="text-center">
            <p className="text-sm text-muted">{card.kind === 'truefalse' ? `${card.front}?` : card.front}</p>
            <p className="mt-3 whitespace-pre-line text-lg font-semibold leading-relaxed sm:text-xl">{card.back}</p>
          </div>
        )}
      </div>
      {front && <p className="text-center text-xs text-subtle">Toque para ver a resposta</p>}
    </div>
  )
}
