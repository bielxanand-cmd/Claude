import { normalize } from '@/lib/text'
import { parseHtml, textOf, type HtmlNode } from './html'
import type { SummaryContent } from './types'

/**
 * Flashcards de um assunto: geração a partir do resumo do usuário e
 * revisão espaçada (variação simplificada do SM-2).
 */

export type FlashcardKind = 'qa' | 'cloze' | 'list' | 'truefalse'
export type FlashcardSource = 'summary' | 'ai' | 'manual'
export type Rating = 'again' | 'hard' | 'good' | 'easy'

export interface ReviewState {
  /** Fator de facilidade (SM-2), mínimo 1,3 */
  ease: number
  /** Intervalo atual em dias (0 = aprendendo) */
  intervalDays: number
  reps: number
  lapses: number
  dueAt: string
  lastReviewedAt: string | null
}

export interface Flashcard {
  id: string
  topicId: string
  front: string
  back: string
  /** Contexto exibido acima da pergunta (ex.: título da seção do resumo) */
  context: string | null
  kind: FlashcardKind
  source: FlashcardSource
  createdAt: string
  review: ReviewState
}

export type FlashcardDraft = Pick<Flashcard, 'front' | 'back' | 'context' | 'kind'>

export const KIND_LABEL: Record<FlashcardKind, string> = {
  qa: 'Pergunta',
  cloze: 'Complete',
  list: 'Liste',
  truefalse: 'Verdadeiro ou falso',
}

/* -------------------------------------------------------------------------- */
/* Geração a partir do resumo                                                  */
/* -------------------------------------------------------------------------- */

const MAX_CARDS = 40
const EMPHASIS = new Set(['strong', 'b', 'mark', 'u', 'em'])
const clean = (t: string) => t.replace(/\s+/g, ' ').replace(/^[\s•\-–]+/, '').trim()
const stripEnd = (t: string) => t.replace(/[\s.;:]+$/, '')

interface Sentence {
  text: string
  /** Trechos destacados (negrito, marca-texto, sublinhado) dentro da frase */
  emphasis: string[]
}

/** Texto de um bloco com a lista de trechos destacados. */
function inline(node: HtmlNode | string, emphasis: string[], inEmphasis = false): string {
  if (typeof node === 'string') return node
  if (node.tag === 'ul' || node.tag === 'ol') return ''
  const text = node.children.map((c) => inline(c, emphasis, inEmphasis || EMPHASIS.has(node.tag))).join('')
  if (EMPHASIS.has(node.tag) && !inEmphasis) {
    const t = clean(text)
    if (t) emphasis.push(t)
  }
  return text
}

function splitSentences(text: string, emphasis: string[]): Sentence[] {
  return clean(text)
    .split(/(?<=[.!?;])\s+(?=["“(]?[A-ZÀ-Ý0-9])/)
    .map((s) => clean(s))
    .filter((s) => s.length > 2)
    .map((s) => ({ text: s, emphasis: emphasis.filter((e) => s.includes(e)) }))
}

function blockSentences(node: HtmlNode): Sentence[] {
  const emphasis: string[] = []
  return splitSentences(inline(node, emphasis), emphasis)
}

/** "Rótulo: explicação" → pergunta e resposta */
function labelled(text: string): { label: string; answer: string } | null {
  const m = stripEnd(text).match(/^(.{2,60}?)\s*(?::|\s[–-]|=>|→)\s+(.{3,})$/)
  if (!m || /\d$/.test(m[1])) return null
  return { label: stripEnd(m[1]), answer: m[2].charAt(0).toUpperCase() + m[2].slice(1) }
}

function cardsFromSentence(s: Sentence, section: keyof SummaryContent, context: string | null): FlashcardDraft[] {
  // 1. Destaques viram lacunas (o que o usuário marcou é o que importa lembrar)
  const blanks = s.emphasis.filter((e) => e.length <= 60 && e.length < s.text.length * 0.7)
  if (blanks.length > 0) {
    let front = stripEnd(s.text)
    for (const b of blanks) front = front.replace(b, '_____')
    return [{ kind: 'cloze', front, back: blanks.join(' · '), context }]
  }
  // 2. "Rótulo: explicação"
  const qa = labelled(s.text)
  if (qa) return [{ kind: 'qa', front: qa.label, back: qa.answer, context }]
  // 3. Afirmações de pontos importantes e pegadinhas
  if ((section === 'keyPoints' || section === 'pitfalls') && s.text.length >= 20)
    return [{ kind: 'truefalse', front: stripEnd(s.text), back: `Verdadeiro. ${stripEnd(s.text)}.`, context }]
  return []
}

function listItems(list: HtmlNode): HtmlNode[] {
  return list.children.filter((c): c is HtmlNode => typeof c !== 'string' && c.tag === 'li')
}

/** Cartões de um campo do resumo. */
function cardsFromSection(html: string, section: keyof SummaryContent, topicName: string): FlashcardDraft[] {
  const root = parseHtml(html)
  const cards: FlashcardDraft[] = []
  let heading: string | null = null

  const visitList = (list: HtmlNode, context: string | null) => {
    const items = listItems(list)
    // Título seguido de lista → "liste os pontos"
    if (context && items.length >= 2 && items.length <= 8 && !items.some((li) => labelled(clean(textOf(li))))) {
      cards.push({
        kind: 'list',
        front: context,
        back: items.map((li) => `• ${stripEnd(clean(textOf(li)))}`).join('\n'),
        context: topicName,
      })
    }
    for (const li of items) {
      for (const s of blockSentences(li)) cards.push(...cardsFromSentence(s, section, context))
      for (const nested of li.children) if (typeof nested !== 'string' && (nested.tag === 'ul' || nested.tag === 'ol')) visitList(nested, stripEnd(clean(textOf(li))) || context)
    }
  }

  const visit = (nodes: (HtmlNode | string)[]) => {
    for (const node of nodes) {
      if (typeof node === 'string') continue
      switch (node.tag) {
        case 'h1':
        case 'h2':
        case 'h3':
          heading = stripEnd(clean(textOf(node))) || heading
          break
        case 'ul':
        case 'ol':
          visitList(node, heading)
          break
        case 'p':
        case 'blockquote':
          for (const s of blockSentences(node)) cards.push(...cardsFromSentence(s, section, heading))
          break
        default:
          visit(node.children)
      }
    }
  }
  visit(root.children)
  return cards
}

/**
 * Gera cartões a partir do texto do resumo (sem IA). Observações não geram
 * cartões — costumam ser dúvidas e lembretes, não conteúdo para memorizar.
 */
export function generateFlashcards(topicName: string, content: SummaryContent): FlashcardDraft[] {
  const sections: (keyof SummaryContent)[] = ['summary', 'keyPoints', 'pitfalls']
  const cards = sections.flatMap((section) => cardsFromSection(content[section] ?? '', section, topicName))
  return dedupe(cards).slice(0, MAX_CARDS)
}

function dedupe<T extends { front: string }>(cards: T[]): T[] {
  const seen = new Set<string>()
  return cards.filter((c) => {
    const key = normalize(c.front)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Cartões do rascunho que ainda não existem no baralho (compara a frente). */
export function newDrafts(existing: Pick<Flashcard, 'front'>[], drafts: FlashcardDraft[]): FlashcardDraft[] {
  const fronts = new Set(existing.map((c) => normalize(c.front)))
  return dedupe(drafts).filter((d) => !fronts.has(normalize(d.front)))
}

export function createCard(topicId: string, draft: FlashcardDraft, source: FlashcardSource, id: string, now = new Date()): Flashcard {
  return {
    id,
    topicId,
    ...draft,
    source,
    createdAt: now.toISOString(),
    review: { ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, dueAt: now.toISOString(), lastReviewedAt: null },
  }
}

/* -------------------------------------------------------------------------- */
/* Revisão espaçada                                                           */
/* -------------------------------------------------------------------------- */

const MINUTE = 60_000
const DAY = 24 * 60 * MINUTE

/** Próximo estado de revisão para a resposta dada (SM-2 simplificado). */
export function schedule(review: ReviewState, rating: Rating, now = new Date()): ReviewState {
  let { ease, intervalDays, reps, lapses } = review
  let delayMs: number
  switch (rating) {
    case 'again':
      ease = Math.max(1.3, ease - 0.2)
      lapses += 1
      reps = 0
      intervalDays = 0
      delayMs = 10 * MINUTE
      break
    case 'hard':
      ease = Math.max(1.3, ease - 0.15)
      if (reps === 0) {
        // Ainda aprendendo: revê em 1 hora
        intervalDays = 0
        delayMs = 60 * MINUTE
      } else {
        intervalDays = Math.max(1, Math.round(intervalDays * 1.2))
        delayMs = intervalDays * DAY
      }
      reps += 1
      break
    case 'good':
      intervalDays = reps === 0 || intervalDays === 0 ? 1 : reps === 1 ? 3 : Math.round(intervalDays * ease)
      reps += 1
      delayMs = intervalDays * DAY
      break
    case 'easy':
      ease += 0.15
      intervalDays = reps === 0 ? 4 : Math.round(Math.max(intervalDays, 1) * ease * 1.3)
      reps += 1
      delayMs = intervalDays * DAY
      break
  }
  return {
    ease: Math.round(ease * 100) / 100,
    intervalDays,
    reps,
    lapses,
    dueAt: new Date(now.getTime() + delayMs).toISOString(),
    lastReviewedAt: now.toISOString(),
  }
}

export const isDue = (card: Flashcard, now = new Date()) => new Date(card.review.dueAt).getTime() <= now.getTime()

/** "10 min", "1 dia", "3 dias", "2 meses" — o que acontece ao escolher cada resposta. */
export function nextIntervalLabel(review: ReviewState, rating: Rating, now = new Date()): string {
  const ms = new Date(schedule(review, rating, now).dueAt).getTime() - now.getTime()
  if (ms < 60 * MINUTE) return `${Math.round(ms / MINUTE)} min`
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} h`
  const days = Math.round(ms / DAY)
  if (days < 30) return `${days} ${days === 1 ? 'dia' : 'dias'}`
  const months = Math.round(days / 30)
  return `${months} ${months === 1 ? 'mês' : 'meses'}`
}

/** Frase de lacuna com as respostas no lugar dos "_____" (partes preenchidas marcadas). */
export function fillCloze(card: Pick<Flashcard, 'front' | 'back'>): { text: string; filled: boolean }[] {
  const answers = card.back.split(' · ')
  const parts = card.front.split('_____')
  return parts.flatMap((text, i) => (i < parts.length - 1 ? [{ text, filled: false }, { text: answers[i] ?? answers.at(-1) ?? '', filled: true }] : [{ text, filled: false }]))
}

/** Ordem de estudo: vencidos primeiro (mais atrasados antes), depois os novos. */
export function studyQueue(cards: Flashcard[], now = new Date(), includeNotDue = false): Flashcard[] {
  const pool = includeNotDue ? cards : cards.filter((c) => isDue(c, now))
  return [...pool].sort((a, b) => a.review.dueAt.localeCompare(b.review.dueAt))
}

/* -------------------------------------------------------------------------- */
/* Geração com IA (quando disponível)                                          */
/* -------------------------------------------------------------------------- */

/** Instrução enviada ao Claude para criar cartões a partir do resumo. */
export function aiFlashcardPrompt(input: { topic: string; subject: string; position: string; notes: string }): string {
  return `Você cria flashcards para quem estuda para concursos públicos no Brasil.

Cargo: ${input.position}
Disciplina: ${input.subject}
Assunto: ${input.topic}

Anotações do estudante (use SOMENTE este conteúdo; não invente leis, números ou fatos que não estejam nele):
"""
${input.notes.slice(0, 12000)}
"""

Crie de 6 a 20 flashcards objetivos, no estilo de prova de concurso. Prefira perguntas diretas, pegadinhas comuns das bancas e itens de "complete a lacuna" com _____ para termos-chave. Respostas curtas (até 3 linhas).

Responda apenas com um array JSON no formato:
[{"front": "pergunta", "back": "resposta", "kind": "qa" | "cloze" | "truefalse"}]`
}

/** Valida e normaliza a resposta da IA. */
export function parseAiFlashcards(value: unknown): FlashcardDraft[] {
  if (!Array.isArray(value)) return []
  const kinds: FlashcardKind[] = ['qa', 'cloze', 'truefalse', 'list']
  return dedupe(
    value
      .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
      .map((v) => ({
        front: clean(String(v.front ?? '')).slice(0, 400),
        back: String(v.back ?? '').trim().slice(0, 800),
        context: null,
        kind: kinds.includes(v.kind as FlashcardKind) ? (v.kind as FlashcardKind) : 'qa',
      }))
      .filter((c) => c.front.length > 2 && c.back.length > 0),
  ).slice(0, MAX_CARDS)
}
