import { normalize } from '@/lib/text'
import { topicKeywords } from './book'
import { hintsFor } from './topic-hints'
import type { PlanSubject } from './types'

/**
 * Análise de provas anteriores: separa as questões do texto do PDF,
 * identifica a disciplina e o assunto de cada uma (pelos títulos da prova e
 * pelas palavras-chave dos assuntos do plano) e conta.
 */

export interface ExamQuestion {
  number: number
  text: string
  /** Título de seção da prova em vigor quando a questão apareceu */
  heading: string | null
}

export interface ExamTopicCount {
  topicId: string | null
  name: string
  count: number
}

export interface ExamSubjectCount {
  subjectId: string | null
  name: string
  questions: number
  topics: ExamTopicCount[]
}

/** Resultado salvo de uma prova (ligado ao cargo). */
export interface ExamAnalysis {
  id: string
  positionId: string
  name: string
  year: number | null
  examBoard: string | null
  method: 'auto' | 'ai'
  createdAt: string
  totalQuestions: number
  subjects: ExamSubjectCount[]
}

export const UNIDENTIFIED = 'Não identificada'
export const OTHER_TOPIC = 'Outros assuntos'

/* -------------------------------------------------------------------------- */
/* 1. Questões e títulos de seção                                             */
/* -------------------------------------------------------------------------- */

const QUESTION_START = [
  /^quest[aã]o\s*(?:n[ºo°.]\s*)?(\d{1,3})\b\s*[.:)\-–]?\s*(.*)$/i,
  /^(\d{1,3})\s*[.)\-–:]\s+(\S.*)$/,
  /^(\d{1,3})\s+([A-ZÀ-Ú(“"'].*)$/,
  /^(\d{1,3})$/,
]

const NOISE_HEADING = /^(rascunho|caderno|gabarito|folha|p[aá]gina|cargo|prova|aplica[cç][aã]o|leia|instru[cç][oõ]es|boa prova|cebraspe|cespe|fgv|vunesp|fcc|cesgranrio|ibfc|quadrix|idecan|aocp|texto|julgue|considere|com base|a respeito)\b/i

function isHeading(line: string): boolean {
  if (line.length < 4 || line.length > 90) return false
  if (/^\d/.test(line) || /\d{3,}/.test(line)) return false
  const letters = line.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letters.length < 4) return false
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, '').length
  return upper / letters.length >= 0.85 && !NOISE_HEADING.test(line)
}

/**
 * Separa as questões numeradas (1, 2, 3… em sequência) e guarda o título de
 * seção (ex.: "LÍNGUA PORTUGUESA") em vigor para cada uma. Cabeçalhos e
 * rodapés que se repetem em muitas páginas são ignorados.
 */
export function splitQuestions(pages: string[]): ExamQuestion[] {
  const pageLines = pages.map((p) =>
    p
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  )
  // Linhas que aparecem em muitas páginas são cabeçalho/rodapé
  const seen = new Map<string, number>()
  for (const lines of pageLines) for (const l of new Set(lines)) seen.set(l, (seen.get(l) ?? 0) + 1)
  const repeated = (l: string) => pages.length >= 4 && (seen.get(l) ?? 0) >= Math.max(3, pages.length * 0.3)

  const questions: ExamQuestion[] = []
  let heading: string | null = null
  let current: ExamQuestion | null = null
  const expected = () => (questions.length ? questions.at(-1)!.number + 1 : 1)

  const lines = pageLines.flatMap((ls) => ls.filter((l) => !repeated(l)).map((l, i, all) => ({ l, last: i === all.length - 1 })))
  for (const { l: line, last } of lines) {
    let started = false
    for (const pattern of QUESTION_START) {
      const m = line.match(pattern)
      if (!m) continue
      // Número sozinho no fim da página é o número da página
      if (last && !m[2]) break
      const n = Number(m[1])
      // Aceita a próxima da sequência (ou pula uma que o PDF tenha perdido)
      const next = expected()
      if (n === next || (questions.length > 0 && n === next + 1)) {
        current = { number: n, text: (m[2] ?? '').trim(), heading }
        questions.push(current)
        started = true
      }
      break
    }
    if (started) continue
    if (isHeading(line)) {
      heading = line.replace(/\s*\(.*\)\s*$/, '').trim()
      continue
    }
    if (current && current.text.length < 3000) current.text += ` ${line}`
  }
  return questions
}

/* -------------------------------------------------------------------------- */
/* 2. Disciplina e assunto de cada questão                                    */
/* -------------------------------------------------------------------------- */

const words = (text: string) =>
  normalize(text)
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 4)

/** Disciplina do plano que corresponde ao título de seção da prova. */
export function subjectForHeading(heading: string, subjects: PlanSubject[]): PlanSubject | null {
  const h = normalize(heading).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  let best: { subject: PlanSubject; score: number } | null = null
  for (const s of subjects) {
    const name = normalize(s.subject.name).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
    if (!name) continue
    if (h === name || h.includes(name) || (name.includes(h) && h.length >= 8)) return s
    const hw = new Set(words(h))
    const nw = words(name)
    if (nw.length === 0) continue
    const score = nw.filter((w) => hw.has(w)).length / nw.length
    if (score >= 0.6 && (!best || score > best.score)) best = { subject: s, score }
  }
  return best?.subject ?? null
}

interface TopicIndexEntry {
  subject: PlanSubject
  topicId: string
  name: string
  terms: string[]
  phrases: string[]
  /** Expressões típicas do assunto (vocabulário): pesam mais que palavras soltas */
  hintPhrases: string[]
}

export interface Classifier {
  classify(question: ExamQuestion, subject: PlanSubject | null): { subject: PlanSubject | null; topicId: string | null }
}

/** Classificador por palavras-chave (nome e subitens de cada assunto, com peso pela raridade). */
export function createClassifier(subjects: PlanSubject[]): Classifier {
  const entries: TopicIndexEntry[] = subjects.flatMap((s) =>
    s.topics.map((t) => {
      const k = topicKeywords(t.topic.name, t.details)
      // Vocabulário típico do assunto: expressões viram frases; palavras soltas, termos
      const hints = hintsFor(t.topic.name)
      const phrases = k.phrases
      const hintPhrases = hints.filter((h) => h.includes(' '))
      const terms = [...new Set([...k.terms, ...hints.filter((h) => !h.includes(' ')).map((w) => (w.length >= 6 ? w.slice(0, w.length - 1) : w))])]
      return { subject: s, topicId: t.topic.id, name: t.topic.name, terms, phrases, hintPhrases }
    }),
  )
  const df = new Map<string, number>()
  for (const e of entries) for (const t of e.terms) df.set(t, (df.get(t) ?? 0) + 1)
  const idf = (t: string) => Math.log(1 + entries.length / (df.get(t) ?? 1))
  const subjectTerms = new Map(subjects.map((s) => [s, topicKeywords(s.subject.name).terms]))

  const score = (text: string, e: TopicIndexEntry) => {
    let s = 0
    // Termos curtos (siglas) só como palavra inteira; os demais como início de palavra
    for (const term of e.terms) if (text.includes(term.length <= 4 ? ` ${term} ` : ` ${term}`)) s += idf(term)
    for (const p of e.phrases) if (text.includes(` ${p}`)) s += 4
    for (const p of e.hintPhrases) if (text.includes(` ${p}`)) s += 6
    return s
  }

  return {
    classify(question, subject) {
      const text = ` ${normalize(question.text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `
      const pool = subject ? entries.filter((e) => e.subject === subject) : entries
      let best: { e: TopicIndexEntry; s: number } | null = null
      for (const e of pool) {
        const s = score(text, e)
        if (s > (best?.s ?? 0)) best = { e, s }
      }
      const threshold = subject ? 1.2 : 2.5
      if (best && best.s >= threshold) return { subject: best.e.subject, topicId: best.e.topicId }
      if (subject) return { subject, topicId: null }
      // Sem assunto claro: tenta só a disciplina pelo nome
      let bestSubject: { s: PlanSubject; n: number } | null = null
      for (const [s, terms] of subjectTerms) {
        const n = terms.filter((t) => text.includes(` ${t}`)).length
        if (n > 0 && n > (bestSubject?.n ?? 0)) bestSubject = { s, n }
      }
      return { subject: bestSubject?.s ?? null, topicId: null }
    },
  }
}

/** Uma classificação por questão: disciplina (id do plano ou nome) e assunto. */
export interface QuestionLabel {
  subjectId: string | null
  subjectName: string
  topicId: string | null
  topicName: string | null
}

/** Classificação automática de todas as questões. */
export function classifyQuestions(questions: ExamQuestion[], subjects: PlanSubject[]): QuestionLabel[] {
  const classifier = createClassifier(subjects)
  const byHeading = new Map<string, PlanSubject | null>()
  return questions.map((q) => {
    let sectionSubject: PlanSubject | null = null
    if (q.heading) {
      if (!byHeading.has(q.heading)) byHeading.set(q.heading, subjectForHeading(q.heading, subjects))
      sectionSubject = byHeading.get(q.heading) ?? null
    }
    const { subject, topicId } = classifier.classify(q, sectionSubject)
    const topic = subject?.topics.find((t) => t.topic.id === topicId)
    return {
      subjectId: subject?.subject.id ?? null,
      // Título da prova que não é disciplina do plano continua sendo uma disciplina da prova
      subjectName: subject?.subject.name ?? (q.heading && !/conhecimentos (basicos|gerais|especificos)/.test(normalize(q.heading)) ? titleCase(q.heading) : UNIDENTIFIED),
      topicId: topic?.topic.id ?? null,
      topicName: topic?.topic.name ?? null,
    }
  })
}

function titleCase(text: string): string {
  const small = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o'])
  return text
    .toLocaleLowerCase('pt-BR')
    .split(' ')
    .map((w, i) => (i > 0 && small.has(w) ? w : w.charAt(0).toLocaleUpperCase('pt-BR') + w.slice(1)))
    .join(' ')
}

/** Conta questões por disciplina e por assunto. */
export function countLabels(labels: QuestionLabel[]): ExamSubjectCount[] {
  const subjects = new Map<string, ExamSubjectCount>()
  for (const l of labels) {
    const key = l.subjectId ?? `name:${normalize(l.subjectName)}`
    const s = subjects.get(key) ?? { subjectId: l.subjectId, name: l.subjectName, questions: 0, topics: [] }
    s.questions++
    const tName = l.topicName ?? OTHER_TOPIC
    const t = s.topics.find((x) => (l.topicId ? x.topicId === l.topicId : !x.topicId && x.name === tName))
    if (t) t.count++
    else s.topics.push({ topicId: l.topicId, name: tName, count: 1 })
    subjects.set(key, s)
  }
  return [...subjects.values()]
    .map((s) => ({ ...s, topics: s.topics.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'pt-BR')) }))
    .sort((a, b) => b.questions - a.questions)
}

/* -------------------------------------------------------------------------- */
/* 3. Com o Claude                                                            */
/* -------------------------------------------------------------------------- */

/** Catálogo numerado (D1, D1.2…) das disciplinas e assuntos do plano, para o Claude escolher. */
export function planCatalog(subjects: PlanSubject[]): { text: string; resolve(code: string | null | undefined): { subject: PlanSubject | null; topicId: string | null } } {
  const lines: string[] = []
  subjects.forEach((s, i) => {
    lines.push(`D${i + 1}. ${s.subject.name}`)
    s.topics.forEach((t, j) => lines.push(`  D${i + 1}.${j + 1} ${t.topic.name}`))
  })
  return {
    text: lines.join('\n'),
    resolve(code) {
      const m = String(code ?? '').match(/D?(\d+)(?:\.(\d+))?/i)
      if (!m) return { subject: null, topicId: null }
      const s = subjects[Number(m[1]) - 1]
      if (!s) return { subject: null, topicId: null }
      const t = m[2] ? s.topics[Number(m[2]) - 1] : undefined
      return { subject: s, topicId: t?.topic.id ?? null }
    },
  }
}

export function aiClassifyPrompt(input: { position: string; catalog: string; questions: ExamQuestion[] }): string {
  const qs = input.questions
    .map((q) => `[${q.number}]${q.heading ? ` (seção: ${q.heading})` : ''} ${q.text.slice(0, 700)}`)
    .join('\n\n')
  return `Você classifica questões de provas de concurso público no Brasil.

Cargo: ${input.position}

Disciplinas (D1, D2…) e assuntos (D1.1, D1.2…) do plano de estudos:
${input.catalog}

Questões da prova:
"""
${qs}
"""

Para cada questão, escolha a disciplina e o assunto do plano que ela cobra. Use o código do assunto (ex.: "D2.5") quando houver um adequado; se só a disciplina servir, use o código da disciplina (ex.: "D2"); se a questão for de uma disciplina que não está no plano, use null em "code" e escreva o nome da disciplina em "other".

Responda apenas com um array JSON: [{"n": número da questão, "code": "D2.5" | "D2" | null, "other": "nome da disciplina" | null}]`
}

export function parseAiLabels(value: unknown, questions: ExamQuestion[], subjects: PlanSubject[]): QuestionLabel[] {
  const catalog = planCatalog(subjects)
  const byNumber = new Map<number, { code?: string | null; other?: string | null }>()
  if (Array.isArray(value))
    for (const raw of value) {
      const v = raw as { n?: unknown; code?: unknown; other?: unknown }
      const n = Number(v?.n)
      if (Number.isFinite(n)) byNumber.set(n, { code: typeof v.code === 'string' ? v.code : null, other: typeof v.other === 'string' ? v.other : null })
    }
  return questions.map((q) => {
    const answer = byNumber.get(q.number)
    const { subject, topicId } = catalog.resolve(answer?.code)
    const topic = subject?.topics.find((t) => t.topic.id === topicId)
    return {
      subjectId: subject?.subject.id ?? null,
      subjectName: subject?.subject.name ?? (answer?.other?.trim() || UNIDENTIFIED),
      topicId: topic?.topic.id ?? null,
      topicName: topic?.topic.name ?? null,
    }
  })
}

/* -------------------------------------------------------------------------- */
/* 4. Visão consolidada de várias provas                                      */
/* -------------------------------------------------------------------------- */

export interface AggregatedTopic extends ExamTopicCount {
  /** Fração das questões da disciplina */
  share: number
}

export interface AggregatedSubject {
  key: string
  subjectId: string | null
  name: string
  questions: number
  /** Fração do total de questões */
  share: number
  topics: AggregatedTopic[]
}

export function aggregateExams(exams: ExamAnalysis[]): { total: number; subjects: AggregatedSubject[] } {
  const total = exams.reduce((n, e) => n + e.totalQuestions, 0)
  const map = new Map<string, { key: string; subjectId: string | null; name: string; questions: number; topics: Map<string, ExamTopicCount> }>()
  for (const exam of exams)
    for (const s of exam.subjects) {
      const key = s.subjectId ?? `name:${normalize(s.name)}`
      const entry = map.get(key) ?? { key, subjectId: s.subjectId, name: s.name, questions: 0, topics: new Map() }
      entry.questions += s.questions
      for (const t of s.topics) {
        const tKey = t.topicId ?? `name:${normalize(t.name)}`
        const cur = entry.topics.get(tKey) ?? { topicId: t.topicId, name: t.name, count: 0 }
        cur.count += t.count
        entry.topics.set(tKey, cur)
      }
      map.set(key, entry)
    }
  const subjects = [...map.values()]
    .map((s) => ({
      key: s.key,
      subjectId: s.subjectId,
      name: s.name,
      questions: s.questions,
      share: total ? s.questions / total : 0,
      topics: [...s.topics.values()]
        .map((t) => ({ ...t, share: s.questions ? t.count / s.questions : 0 }))
        // "Outros assuntos" sempre por último
        .sort((a, b) => Number(!a.topicId && a.name === OTHER_TOPIC) - Number(!b.topicId && b.name === OTHER_TOPIC) || b.count - a.count),
    }))
    .sort((a, b) => Number(a.name === UNIDENTIFIED) - Number(b.name === UNIDENTIFIED) || b.questions - a.questions)
  return { total, subjects }
}
