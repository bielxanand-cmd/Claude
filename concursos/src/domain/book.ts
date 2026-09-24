import { splitSentences } from './sentences'
import { normalize } from '@/lib/text'
import { escapeHtml, sanitizeSummaryHtml } from './sanitize-html'
import type { SummaryContent } from './types'

/**
 * Preenchimento de resumos a partir de um livro/apostila em PDF:
 *   1. `findRelevantPages` localiza as páginas que tratam do assunto;
 *   2. `extractiveSummary` monta os campos com trechos do livro (sem IA), ou
 *      `aiSummaryPrompt` + `parseAiSummary` pedem ao Claude um resumo baseado
 *      apenas nesses trechos.
 */

export interface BookPage {
  /** Número da página no PDF (1-based) */
  number: number
  text: string
}

export interface RelevantExcerpt {
  pages: BookPage[]
  firstPage: number
  lastPage: number
  score: number
}

/* -------------------------------------------------------------------------- */
/* Texto das páginas                                                          */
/* -------------------------------------------------------------------------- */

/** Junta as linhas quebradas do PDF em parágrafos (e desfaz hifenização). */
export function cleanPageText(raw: string): string {
  return raw
    .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^\d{1,4}$/.test(l)) // números de página
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const toBookPages = (pages: string[]): BookPage[] => pages.map((text, i) => ({ number: i + 1, text: cleanPageText(text) }))

/* -------------------------------------------------------------------------- */
/* Busca das páginas do assunto                                               */
/* -------------------------------------------------------------------------- */

const STOPWORDS = new Set(
  'a o as os de da do das dos e em no na nos nas para por com sem sob sobre ao aos à às um uma uns umas que se seu sua seus suas ou lei nº art arts conceito conceitos noções nocoes aplicação aplicacao aspectos gerais geral espécies especies'.split(
    ' ',
  ),
)

/** Palavras-chave do assunto: nome do assunto + subitens do edital. */
export function topicKeywords(topicName: string, details: string[] = []): { terms: string[]; phrases: string[] } {
  const words = (text: string) =>
    normalize(text)
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(' ')
      .filter((w) => w.length >= 4 && !STOPWORDS.has(w))
  // Radical simples: "emendas" → "emend", "constituinte" → "constituin" (casa singular/plural e variações)
  const stem = (w: string) => w.slice(0, Math.max(5, w.length - 2))
  const terms = [...new Set([...words(topicName), ...details.flatMap(words)].map(stem))]
  const phrases = [topicName, ...details]
    .map((p) => normalize(p).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.split(' ').length >= 2)
  return { terms, phrases }
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0
  for (let i = haystack.indexOf(needle); i >= 0; i = haystack.indexOf(needle, i + needle.length)) count++
  return count
}

function pageScore(page: BookPage, keywords: { terms: string[]; phrases: string[] }, nameTerms: string[]): number {
  const text = ` ${normalize(page.text).replace(/[^a-z0-9 ]/g, ' ')} `
  let score = 0
  let matchedName = 0
  for (const term of keywords.terms) {
    const n = countOccurrences(text, ` ${term}`)
    if (n > 0) {
      score += Math.min(n, 8) * (nameTerms.includes(term) ? 2 : 1)
      if (nameTerms.includes(term)) matchedName++
    }
  }
  for (const phrase of keywords.phrases) score += countOccurrences(text, phrase) * 12
  // Página que cobre todas as palavras do nome do assunto vale mais
  if (nameTerms.length > 0 && matchedName === nameTerms.length) score *= 1.5
  return score
}

/**
 * Páginas mais relevantes para o assunto: a melhor página e as vizinhas que
 * continuam o tema (até `maxPages`). `null` quando o livro não trata do assunto.
 */
/** Pontuação de cada página (exportada para depuração/testes). */
export function scorePages(pages: BookPage[], topicName: string, details: string[] = []): number[] {
  const keywords = topicKeywords(topicName, details)
  const nameTerms = topicKeywords(topicName).terms
  return pages.map((p) => pageScore(p, keywords, nameTerms))
}

export function findRelevantPages(pages: BookPage[], topicName: string, details: string[] = [], maxPages = 6): RelevantExcerpt | null {
  const keywords = topicKeywords(topicName, details)
  const nameTerms = topicKeywords(topicName).terms
  if (keywords.terms.length === 0) return null
  const scores = pages.map((p) => pageScore(p, keywords, nameTerms))
  let best = 0
  scores.forEach((s, i) => {
    if (s > scores[best]) best = i
  })
  if (scores[best] < 6) return null

  let start = best
  let end = best
  // Vizinhas continuam o capítulo mesmo repetindo menos o nome do assunto
  const threshold = Math.max(4, scores[best] * 0.15)
  const keep = (i: number) => i >= 0 && i < pages.length && scores[i] >= threshold
  while (end - start + 1 < maxPages) {
    const canNext = keep(end + 1)
    const canPrev = keep(start - 1)
    if (!canNext && !canPrev) break
    if (canNext && (!canPrev || scores[end + 1] >= scores[start - 1])) end++
    else start--
  }
  const selected = pages.slice(start, end + 1)
  return { pages: selected, firstPage: selected[0].number, lastPage: selected.at(-1)!.number, score: Math.round(scores[best]) }
}

export const pageRangeLabel = (e: Pick<RelevantExcerpt, 'firstPage' | 'lastPage'>) =>
  e.firstPage === e.lastPage ? `p. ${e.firstPage}` : `pp. ${e.firstPage}–${e.lastPage}`

/* -------------------------------------------------------------------------- */
/* Preenchimento sem IA (trechos do livro)                                    */
/* -------------------------------------------------------------------------- */

/** Título em caixa alta no início da frase (ex.: "CAPÍTULO 7 — REMÉDIOS CONSTITUCIONAIS Os remédios…"). */
const LEADING_HEADING = /^((?:[A-ZÀ-Ý0-9ºª§–—\-.,:]+\s+){2,}?)(?=[A-ZÀ-Ý][a-zà-ÿ])/
const CHAPTER = /^(cap[íi]tulo|se[çc][ãa]o|t[íi]tulo|parte|unidade|m[óo]dulo)\b/i

interface BookSentence {
  text: string
  /** Título que abria a frase (início de capítulo/seção) */
  heading: string | null
}

function sentencesOf(text: string): BookSentence[] {
  return splitSentences(text)
    .map((raw) => {
      const s = raw.trim()
      const m = s.match(LEADING_HEADING)
      return m ? { text: s.slice(m[1].length).trim(), heading: m[1].trim() } : { text: s, heading: null }
    })
    .filter((x) => x.text.length >= 40 && x.text.length <= 420 && /\p{Ll}/u.test(x.text) && !/^(sumário|índice)/i.test(x.text))
}

/** Destaca prazos, percentuais e artigos (viram lacunas nos flashcards). */
function emphasize(sentence: string): string {
  return escapeHtml(sentence).replace(
    /\b(\d+(?:[.,]\d+)?\s*(?:dias?|meses|m[êe]s|anos?|horas?|%|por cento)|art(?:igo)?\.?\s*\d+[ºo°]?(?:,\s*§\s*\d+[ºo°]?)?|súmula\s+(?:vinculante\s+)?n?[ºo°]?\s*\d+)/gi,
    '<strong>$1</strong>',
  )
}

const PITFALL = /\b(exceto|salvo|ressalvad|não se aplica|não pode|não cabe|vedad|é proibid|somente|apenas|inclusive|independentemente|ainda que|mesmo que)/i
const KEY_POINT = /(\b\d+\s*(dias?|meses|anos?|horas?)\b|\bart(igo)?\.?\s*\d+|\bsúmula\b|\bcompete\b|\bconsiste\b|\bdefine-se\b|\bé o\b|\bsão\b.*\:|\bprazo\b|\bdeve(rá|m)?\b|\bpoderá\b)/i

export function extractiveSummary(input: { topicName: string; bookName: string; excerpt: RelevantExcerpt; details?: string[] }): SummaryContent {
  const { terms } = topicKeywords(input.topicName, input.details)
  const relevance = (s: string) => {
    const n = normalize(s)
    return terms.reduce((sum, t) => sum + (n.includes(t) ? 1 : 0), 0)
  }

  // Lê o trecho em ordem: uma frase sobre o assunto "puxa" as seguintes, que
  // continuam o tema; um título de outro capítulo/seção interrompe.
  const all: { s: string; page: number; score: number }[] = []
  let momentum = 0
  for (const page of input.excerpt.pages) {
    for (const { text, heading } of sentencesOf(page.text)) {
      const score = relevance(text)
      const headingScore = heading ? relevance(heading) : 0
      if (heading && (CHAPTER.test(heading) || heading.split(/\s+/).length >= 3)) momentum = headingScore > 0 ? 6 : 0
      if (score > 0) momentum = 6
      if (momentum > 0 || score > 0) all.push({ s: text, page: page.number, score: score + (momentum > 0 ? 0.5 : 0) })
      momentum = Math.max(0, momentum - 1)
    }
  }
  const pickInOrder = (list: typeof all, max: number) =>
    [...list]
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .sort((a, b) => all.indexOf(a) - all.indexOf(b))

  // Categorias específicas primeiro; o resumo fica com o restante (sem repetir frases)
  const used = new Set<string>()
  const take = (items: typeof all) => (items.forEach((x) => used.add(x.s)), items)
  const pitfalls = take(pickInOrder(all.filter((x) => PITFALL.test(x.s)), 6))
  const keyPoints = take(pickInOrder(all.filter((x) => KEY_POINT.test(x.s) && !used.has(x.s)), 8))
  const core = take(pickInOrder(all.filter((x) => !used.has(x.s)), 12))

  const list = (items: typeof all) => (items.length ? `<ul>${items.map((x) => `<li><p>${emphasize(x.s)}</p></li>`).join('')}</ul>` : '')
  const range = pageRangeLabel(input.excerpt)
  return {
    summary: core.length ? `<h2>${escapeHtml(input.topicName)}</h2>${core.map((x) => `<p>${emphasize(x.s)}</p>`).join('')}` : '',
    keyPoints: list(keyPoints),
    pitfalls: list(pitfalls),
    notes: `<p>Trechos extraídos de <strong>${escapeHtml(input.bookName)}</strong> (${range}). Revise e reescreva com suas palavras.</p>`,
  }
}

/* -------------------------------------------------------------------------- */
/* Preenchimento com o Claude                                                 */
/* -------------------------------------------------------------------------- */

/** Limite de texto do livro enviado ao Claude (a chamada aceita até 64 KiB). */
const AI_EXCERPT_LIMIT = 40_000

export function aiSummaryPrompt(input: {
  topicName: string
  subjectName: string
  positionName: string
  bookName: string
  excerpt: RelevantExcerpt
  details?: string[]
}): string {
  let excerpt = ''
  for (const p of input.excerpt.pages) {
    const chunk = `\n[página ${p.number}]\n${p.text}\n`
    if (excerpt.length + chunk.length > AI_EXCERPT_LIMIT) break
    excerpt += chunk
  }
  return `Você ajuda um estudante de concurso público no Brasil a montar o resumo de um assunto a partir do livro dele.

Cargo: ${input.positionName}
Disciplina: ${input.subjectName}
Assunto: ${input.topicName}
${input.details?.length ? `O edital detalha: ${input.details.join('; ')}\n` : ''}
Trechos do livro "${input.bookName}":
"""${excerpt}"""

Use SOMENTE o conteúdo dos trechos acima; não acrescente leis, prazos, números ou entendimentos que não estejam neles. Escreva em português, de forma objetiva, no estilo de material de revisão para concurso. Destaque com <strong> os termos-chave, prazos e números (eles viram lacunas em flashcards).

Responda apenas com um objeto JSON:
{"summary": "...", "keyPoints": "...", "pitfalls": "...", "notes": "..."}
- summary: resumo organizado, em HTML com <h2>, <h3>, <p>, <ul>/<li>, <strong>
- keyPoints: o que mais cai em prova, em <ul><li>
- pitfalls: pegadinhas e exceções das bancas presentes no texto, em <ul><li> (vazio se não houver)
- notes: fonte com as páginas usadas e o que o livro não cobriu do edital, em <p>`
}

/** Valida e higieniza a resposta da IA. */
export function parseAiSummary(value: unknown): SummaryContent | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const field = (k: string) => (typeof v[k] === 'string' ? sanitizeSummaryHtml(v[k] as string) : '')
  const content = { summary: field('summary'), keyPoints: field('keyPoints'), pitfalls: field('pitfalls'), notes: field('notes') }
  return Object.values(content).some(Boolean) ? content : null
}

/** Junta o conteúdo novo ao existente (ou substitui), campo a campo. */
export function mergeSummary(current: SummaryContent, incoming: SummaryContent, mode: 'append' | 'replace'): SummaryContent {
  const merge = (a: string, b: string) => (mode === 'replace' || !a.trim() ? b : b ? `${a}${b}` : a)
  return {
    summary: merge(current.summary, incoming.summary),
    keyPoints: merge(current.keyPoints, incoming.keyPoints),
    pitfalls: merge(current.pitfalls, incoming.pitfalls),
    notes: merge(current.notes, incoming.notes),
  }
}
