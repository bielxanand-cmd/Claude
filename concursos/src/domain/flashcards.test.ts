import { describe, expect, it } from 'vitest'
import { createCard, fillCloze, generateFlashcards, isDue, newDrafts, nextIntervalLabel, parseAiFlashcards, schedule, studyQueue } from './flashcards'

const empty = { summary: '', keyPoints: '', pitfalls: '', notes: '' }

describe('generateFlashcards', () => {
  it('transforma destaques em lacunas e "Rótulo: explicação" em pergunta', () => {
    const cards = generateFlashcards('Remédios constitucionais', {
      ...empty,
      summary:
        '<h2>Mandado de segurança</h2><ul><li><p>Prazo de <strong>120 dias</strong> para impetrar.</p></li><li><p>Coletivo: partido político, sindicato ou entidade de classe</p></li></ul><p>Habeas corpus: protege a liberdade de locomoção.</p>',
    })
    expect(cards).toContainEqual({ kind: 'cloze', front: 'Prazo de _____ para impetrar', back: '120 dias', context: 'Mandado de segurança' })
    expect(cards).toContainEqual({ kind: 'qa', front: 'Coletivo', back: 'Partido político, sindicato ou entidade de classe', context: 'Mandado de segurança' })
    expect(cards).toContainEqual({ kind: 'qa', front: 'Habeas corpus', back: 'Protege a liberdade de locomoção', context: 'Mandado de segurança' })
  })

  it('título com lista vira cartão "liste"; pontos importantes e pegadinhas viram verdadeiro ou falso', () => {
    const cards = generateFlashcards('Remédios constitucionais', {
      ...empty,
      summary: '<h2>Remédios gratuitos</h2><ul><li><p>Habeas corpus</p></li><li><p>Habeas data</p></li></ul>',
      pitfalls: '<p>Não cabe habeas corpus em punição disciplinar militar.</p>',
      notes: '<p>Revisar súmula 266 do STF depois.</p>',
    })
    expect(cards).toContainEqual({ kind: 'list', front: 'Remédios gratuitos', back: '• Habeas corpus\n• Habeas data', context: 'Remédios constitucionais' })
    expect(cards).toContainEqual({
      kind: 'truefalse',
      front: 'Não cabe habeas corpus em punição disciplinar militar',
      back: 'Verdadeiro. Não cabe habeas corpus em punição disciplinar militar.',
      context: null,
    })
    // Observações não viram cartões
    expect(cards.some((c) => c.front.includes('súmula 266'))).toBe(false)
  })

  it('não repete cartões e ignora frases soltas do resumo sem estrutura', () => {
    const cards = generateFlashcards('X', { ...empty, summary: '<p>Texto corrido sem destaque nenhum aqui.</p><p>Habeas data: informações pessoais.</p><p>Habeas data: informações pessoais.</p>' })
    expect(cards).toHaveLength(1)
  })

  it('newDrafts só acrescenta cartões novos (ignora acentos e caixa)', () => {
    const existing = [{ front: 'Habeas Corpus' }]
    const drafts = [
      { kind: 'qa' as const, front: 'habeas corpus', back: 'x', context: null },
      { kind: 'qa' as const, front: 'Habeas data', back: 'y', context: null },
    ]
    expect(newDrafts(existing, drafts).map((d) => d.front)).toEqual(['Habeas data'])
  })
})

describe('revisão espaçada', () => {
  const now = new Date('2026-09-24T12:00:00Z')
  const card = createCard('t1', { kind: 'qa', front: 'a', back: 'b', context: null }, 'summary', 'c1', now)

  it('cartão novo está para revisar', () => {
    expect(isDue(card, now)).toBe(true)
  })

  it('intervalos crescem com acertos e voltam ao errar', () => {
    const r1 = schedule(card.review, 'good', now)
    expect(r1.intervalDays).toBe(1)
    const r2 = schedule(r1, 'good', now)
    expect(r2.intervalDays).toBe(3)
    const r3 = schedule(r2, 'good', now)
    expect(r3.intervalDays).toBe(Math.round(3 * 2.5))
    const lapse = schedule(r3, 'again', now)
    expect(lapse).toMatchObject({ intervalDays: 0, reps: 0, lapses: 1, ease: 2.3 })
    expect(new Date(lapse.dueAt).getTime() - now.getTime()).toBe(10 * 60_000)
  })

  it('rótulos de próximo intervalo', () => {
    expect(nextIntervalLabel(card.review, 'again', now)).toBe('10 min')
    expect(nextIntervalLabel(card.review, 'hard', now)).toBe('1 h')
    expect(nextIntervalLabel(card.review, 'good', now)).toBe('1 dia')
    expect(nextIntervalLabel(card.review, 'easy', now)).toBe('4 dias')
  })

  it('fila de estudo traz só os vencidos, mais atrasados primeiro', () => {
    const later = { ...card, id: 'c2', review: { ...card.review, dueAt: '2026-10-10T00:00:00Z' } }
    const older = { ...card, id: 'c3', review: { ...card.review, dueAt: '2026-09-01T00:00:00Z' } }
    expect(studyQueue([card, later, older], now).map((c) => c.id)).toEqual(['c3', 'c1'])
    expect(studyQueue([card, later, older], now, true)).toHaveLength(3)
  })
})

describe('fillCloze', () => {
  it('preenche a lacuna com a resposta', () => {
    expect(fillCloze({ front: 'Prazo de _____ para impetrar', back: '120 dias' })).toEqual([
      { text: 'Prazo de ', filled: false },
      { text: '120 dias', filled: true },
      { text: ' para impetrar', filled: false },
    ])
  })
})

describe('parseAiFlashcards', () => {
  it('valida a resposta da IA', () => {
    expect(
      parseAiFlashcards([
        { front: 'Prazo do MS?', back: '120 dias', kind: 'qa' },
        { front: '', back: 'sem pergunta' },
        { front: 'Cabe HC contra punição militar?', back: 'Não', kind: 'estranho' },
        'lixo',
      ]),
    ).toEqual([
      { front: 'Prazo do MS?', back: '120 dias', kind: 'qa', context: null },
      { front: 'Cabe HC contra punição militar?', back: 'Não', kind: 'qa', context: null },
    ])
    expect(parseAiFlashcards({ not: 'array' })).toEqual([])
  })
})
