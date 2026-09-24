import { Layers3, Play } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useFlashcards } from '@/data/queries'
import { isDue, studyQueue, type Flashcard } from '@/domain/flashcards'
import type { PlanSubject } from '@/domain/types'
import { StudySession } from './study-session'

/** Flashcards de todos os assuntos de uma disciplina, com revisão do dia. */
export function SubjectFlashcards({ subject }: { subject: PlanSubject }) {
  const flashcards = useFlashcards()
  const [session, setSession] = useState<Flashcard[] | null>(null)

  const topicNames = useMemo(() => new Map(subject.topics.map((t) => [t.topic.id, t.topic.name])), [subject])
  const cards = useMemo(() => (flashcards.data ?? []).filter((c) => topicNames.has(c.topicId)), [flashcards.data, topicNames])
  const due = cards.filter((c) => isDue(c))
  const topicsWithCards = new Set(cards.map((c) => c.topicId)).size

  if (flashcards.isLoading) return null

  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-tint text-primary dark:text-primary-soft">
        <Layers3 className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-bold">Flashcards da disciplina</h2>
        <p className="mt-0.5 text-sm text-muted">
          {cards.length === 0
            ? 'Abra um assunto e use “Flashcards” para criar cartões a partir do seu resumo.'
            : `${cards.length} ${cards.length === 1 ? 'cartão' : 'cartões'} em ${topicsWithCards} ${topicsWithCards === 1 ? 'assunto' : 'assuntos'} · ${due.length} para revisar agora`}
        </p>
      </div>
      {cards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {due.length === 0 && (
            <Button variant="ghost" size="sm" onClick={() => setSession(studyQueue(cards, new Date(), true))}>
              Estudar todos
            </Button>
          )}
          <Button size="sm" onClick={() => setSession(studyQueue(cards))} disabled={due.length === 0}>
            <Play /> {due.length > 0 ? `Revisar ${due.length}` : 'Em dia'}
          </Button>
        </div>
      )}
      <StudySession
        open={!!session}
        onOpenChange={(open) => !open && setSession(null)}
        cards={session ?? []}
        title={`Flashcards · ${subject.subject.name}`}
        topicNames={topicNames}
      />
    </Card>
  )
}
