import { Layers3, Loader2, Pencil, Play, Plus, Sparkles, Trash2, Wand2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Label, Textarea } from '@/components/ui/input'
import { useFlashcards, useSaveTopicFlashcards } from '@/data/queries'
import {
  aiFlashcardPrompt,
  createCard,
  generateFlashcards,
  isDue,
  KIND_LABEL,
  newDrafts,
  parseAiFlashcards,
  type Flashcard,
  type FlashcardDraft,
  type FlashcardSource,
} from '@/domain/flashcards'
import type { SummaryContent } from '@/domain/types'
import { HIDE_CODES, sampleErrorMessage, useClaudeSample } from '@/features/ai/claude-sample'
import { uuid } from '@/lib/storage'
import { htmlToText } from '@/lib/text'
import { cn } from '@/lib/utils'

interface Suggestion extends FlashcardDraft {
  key: string
  source: FlashcardSource
  selected: boolean
}

const toSuggestions = (drafts: FlashcardDraft[], source: FlashcardSource): Suggestion[] =>
  drafts.map((d, i) => ({ ...d, key: `${source}-${i}-${d.front}`, source, selected: true }))

/**
 * Baralho de flashcards de um assunto: sugere cartões a partir do resumo
 * (e, na página publicada, com o Claude), permite editar, excluir, criar
 * à mão e começar a estudar.
 */
export function FlashcardsDialog({
  open,
  onOpenChange,
  topicId,
  topicName,
  subjectName,
  positionName,
  content,
  onStudy,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: string
  topicName: string
  subjectName: string
  positionName: string
  /** Texto atual do resumo (inclui alterações não salvas) */
  content: SummaryContent
  onStudy: (cards: Flashcard[]) => void
}) {
  const flashcards = useFlashcards()
  const save = useSaveTopicFlashcards()
  const deck = useMemo(() => (flashcards.data ?? []).filter((c) => c.topicId === topicId), [flashcards.data, topicId])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const { sample, disable } = useClaudeSample()
  const [aiBusy, setAiBusy] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const hasText = Object.values(content).some((html) => htmlToText(html).length > 0)

  // Ao abrir: sugere os cartões do resumo que ainda não estão no baralho
  useEffect(() => {
    if (!open || flashcards.isLoading) return
    setSuggestions(toSuggestions(newDrafts(deck, generateFlashcards(topicName, content)), 'summary'))
    setEditing(null)
    setAdding(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, flashcards.isLoading])

  const persist = (cards: Flashcard[], message?: string) =>
    save.mutate(
      { topicId, cards },
      {
        onSuccess: () => message && toast.success(message),
        onError: () => toast.error('Não foi possível salvar os flashcards.'),
      },
    )

  const selected = suggestions.filter((s) => s.selected)
  const addSelected = () => {
    const now = new Date()
    const cards = selected.map((s) => createCard(topicId, { front: s.front, back: s.back, context: s.context, kind: s.kind }, s.source, uuid(), now))
    persist([...deck, ...cards], `${cards.length} ${cards.length === 1 ? 'cartão adicionado' : 'cartões adicionados'}`)
    setSuggestions((list) => list.filter((s) => !s.selected))
  }

  const regenerate = () => {
    const fresh = newDrafts([...deck, ...suggestions], generateFlashcards(topicName, content))
    if (fresh.length === 0) toast('Nenhum cartão novo no resumo', { description: 'Use títulos, listas, negrito e o formato “Tema: explicação”.' })
    setSuggestions((list) => [...list, ...toSuggestions(fresh, 'summary')])
  }

  const generateWithAi = async () => {
    if (!sample) return
    const notes = (['summary', 'keyPoints', 'pitfalls', 'notes'] as const)
      .map((k) => htmlToText(content[k]))
      .filter(Boolean)
      .join('\n\n')
    abortRef.current = new AbortController()
    setAiBusy(true)
    try {
      const value = await sample.json(aiFlashcardPrompt({ topic: topicName, subject: subjectName, position: positionName, notes }), {
        modelTier: 'default',
        signal: abortRef.current.signal,
      })
      const drafts = newDrafts([...deck, ...suggestions], parseAiFlashcards(value))
      if (drafts.length === 0) toast('O Claude não sugeriu cartões novos.')
      setSuggestions((list) => [...toSuggestions(drafts, 'ai'), ...list])
    } catch (e) {
      const code = (e as { code?: string })?.code
      if (code === 'cancelled') return
      if (code && HIDE_CODES.has(code)) disable()
      toast.error(sampleErrorMessage(e))
    } finally {
      setAiBusy(false)
      abortRef.current = null
    }
  }

  const updateCard = (id: string, patch: Pick<Flashcard, 'front' | 'back'>) => {
    persist(deck.map((c) => (c.id === id ? { ...c, ...patch } : c)), 'Cartão atualizado')
    setEditing(null)
  }
  const removeCard = (id: string) => persist(deck.filter((c) => c.id !== id))
  const addManual = (draft: Pick<Flashcard, 'front' | 'back'>) => {
    persist([...deck, createCard(topicId, { ...draft, context: null, kind: 'qa' }, 'manual', uuid())], 'Cartão criado')
    setAdding(false)
  }

  const due = deck.filter((c) => isDue(c))

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
            <Layers3 className="size-5 text-primary" /> Flashcards
          </DialogTitle>
          <DialogDescription>
            {topicName} · {deck.length} {deck.length === 1 ? 'cartão' : 'cartões'}
            {deck.length > 0 && <> · {due.length} para revisar agora</>}
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Sugestões */}
          <section aria-labelledby="fc-suggestions">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h3 id="fc-suggestions" className="mr-auto text-sm font-bold">
                Sugestões do seu resumo
              </h3>
              <Button variant="ghost" size="sm" onClick={regenerate} disabled={!hasText}>
                <Wand2 /> Gerar do resumo
              </Button>
              {sample && (
                <Button variant="secondary" size="sm" onClick={generateWithAi} disabled={!hasText || aiBusy}>
                  {aiBusy ? <Loader2 className="animate-spin" /> : <Sparkles />} {aiBusy ? 'Claude pensando…' : 'Gerar com o Claude'}
                </Button>
              )}
            </div>

            {!hasText ? (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">
                Escreva seu resumo primeiro. Os cartões são criados a partir de títulos com listas, trechos em <strong>negrito</strong> ou destacados (viram
                lacunas), itens no formato “Tema: explicação” e frases de Pontos importantes e Pegadinhas.
              </p>
            ) : suggestions.length === 0 ? (
              <p className="rounded-xl bg-foreground/[0.03] px-4 py-4 text-sm text-muted">
                {deck.length > 0 ? 'Tudo o que o resumo sugere já está no baralho.' : 'Nenhum cartão encontrado no resumo.'} Destaque termos em negrito e use “Tema:
                explicação” para gerar mais{sample ? ', ou peça ao Claude.' : '.'}
              </p>
            ) : (
              <>
                <ul className="space-y-2">
                  {suggestions.map((s) => (
                    <li key={s.key}>
                      <label
                        className={cn(
                          'flex cursor-pointer gap-3 rounded-xl border p-3 transition',
                          s.selected ? 'border-primary/40 bg-primary-tint/40' : 'border-border opacity-70',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={s.selected}
                          onChange={(e) => setSuggestions((list) => list.map((x) => (x.key === s.key ? { ...x, selected: e.target.checked } : x)))}
                          className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                        />
                        <CardPreview front={s.front} back={s.back} kind={KIND_LABEL[s.kind]} context={s.context} ai={s.source === 'ai'} />
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex justify-end">
                  <Button onClick={addSelected} disabled={selected.length === 0} loading={save.isPending}>
                    <Plus /> Adicionar {selected.length} ao baralho
                  </Button>
                </div>
              </>
            )}
          </section>

          {/* Baralho */}
          <section aria-labelledby="fc-deck">
            <div className="mb-3 flex items-center gap-2">
              <h3 id="fc-deck" className="mr-auto text-sm font-bold">
                Seu baralho
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
                <Plus /> Cartão manual
              </Button>
            </div>
            {adding && <CardEditor onSave={addManual} onCancel={() => setAdding(false)} />}
            {deck.length === 0 && !adding ? (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-sm text-muted">Adicione sugestões ou crie cartões à mão.</p>
            ) : (
              <ul className="space-y-2">
                {deck.map((c) =>
                  editing === c.id ? (
                    <li key={c.id}>
                      <CardEditor initial={c} onSave={(patch) => updateCard(c.id, patch)} onCancel={() => setEditing(null)} />
                    </li>
                  ) : (
                    <li key={c.id} className="group flex gap-2 rounded-xl border border-border bg-surface p-3">
                      <CardPreview
                        front={c.front}
                        back={c.back}
                        kind={KIND_LABEL[c.kind]}
                        context={c.context}
                        ai={c.source === 'ai'}
                        meta={isDue(c) ? 'para revisar' : `próxima revisão ${new Date(c.review.dueAt).toLocaleDateString('pt-BR')}`}
                      />
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                        <button
                          type="button"
                          onClick={() => setEditing(c.id)}
                          aria-label="Editar cartão"
                          className="grid size-8 place-items-center rounded-lg text-subtle hover:bg-foreground/[0.06] hover:text-foreground"
                        >
                          <Pencil className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeCard(c.id)}
                          aria-label="Excluir cartão"
                          className="grid size-8 place-items-center rounded-lg text-subtle hover:bg-danger-tint hover:text-danger"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
          {deck.length > 0 && due.length === 0 && (
            <Button variant="ghost" onClick={() => onStudy(deck)}>
              Estudar todos mesmo assim
            </Button>
          )}
          <Button onClick={() => onStudy(due)} disabled={due.length === 0}>
            <Play /> {due.length > 0 ? `Estudar ${due.length} ${due.length === 1 ? 'cartão' : 'cartões'}` : 'Nada para revisar agora'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CardPreview({ front, back, kind, context, ai, meta }: { front: string; back: string; kind: string; context: string | null; ai?: boolean; meta?: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-muted">
        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5">{kind}</span>
        {ai && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2 py-0.5 text-primary-strong dark:text-primary-soft">
            <Sparkles className="size-3" /> Claude
          </span>
        )}
        {context && <span className="truncate">{context}</span>}
        {meta && <span className="ml-auto text-subtle">{meta}</span>}
      </div>
      <p className="text-sm font-semibold">{front}</p>
      <p className="mt-1 whitespace-pre-line text-sm text-muted">{back}</p>
    </div>
  )
}

function CardEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Pick<Flashcard, 'front' | 'back'>
  onSave: (card: Pick<Flashcard, 'front' | 'back'>) => void
  onCancel: () => void
}) {
  const [front, setFront] = useState(initial?.front ?? '')
  const [back, setBack] = useState(initial?.back ?? '')
  const valid = front.trim().length > 0 && back.trim().length > 0
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ front: front.trim(), back: back.trim() })
      }}
      className="mb-2 space-y-3 rounded-xl border border-primary/40 bg-surface p-3"
    >
      <div>
        <Label htmlFor="fc-front">Frente (pergunta)</Label>
        <Textarea id="fc-front" value={front} onChange={(e) => setFront(e.target.value)} className="min-h-16" autoFocus />
      </div>
      <div>
        <Label htmlFor="fc-back">Verso (resposta)</Label>
        <Textarea id="fc-back" value={back} onChange={(e) => setBack(e.target.value)} className="min-h-16" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X /> Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={!valid}>
          Salvar cartão
        </Button>
      </div>
    </form>
  )
}
