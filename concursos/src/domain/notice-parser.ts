import type { NoticeImportSubject } from './types'

/**
 * Converte o "conteúdo programático" de um edital (texto colado) em
 * disciplinas e assuntos. É o primeiro canal de importação; o upload de PDF
 * (futuro) só precisa extrair o texto e reutilizar este parser.
 *
 * Formatos aceitos (podem ser misturados):
 *
 *   LÍNGUA PORTUGUESA (peso 2, 20 questões): 1. Interpretação de textos. 2. Crase.
 *
 *   Direito Tributário:
 *   - Competência tributária
 *   - Crédito tributário
 */

const HEADER = /^\s*(?:\d{1,2}\s*[.)\-–]\s*)?([^:()]{2,90}?)\s*(?:\(([^)]*)\))?\s*:\s*(.*)$/
const BULLET = /^\s*(?:[-•*▪●◦]|\d{1,2}\s*[.)\-–])\s+/
const INLINE_ITEM = /(?:^|\s)\d{1,2}\s*[.)\-–]\s+/

function isMostlyUppercase(text: string): boolean {
  const letters = text.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '')
  if (letters.length < 3) return false
  const upper = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, '').length
  return upper / letters.length >= 0.6
}

function titleCase(text: string): string {
  const lower = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'a', 'o', 'à', 'em', 'na', 'no', 'para'])
  return text
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => (i > 0 && lower.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ')
}

function cleanItem(text: string): string {
  return text
    .replace(BULLET, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s.;,–-]+|[\s.;,]+$/g, '')
    .trim()
}

function splitItems(text: string): string[] {
  const parts = INLINE_ITEM.test(text) ? text.split(INLINE_ITEM) : text.split(/;\s*/)
  return parts.map(cleanItem).filter((item) => item.length > 1)
}

function parseMeta(meta: string | undefined) {
  const weight = meta?.match(/peso\s*(\d+(?:[.,]\d+)?)/i)?.[1]
  const questions = meta?.match(/(\d+)\s*quest/i)?.[1]
  return {
    weight: weight ? Number(weight.replace(',', '.')) : null,
    questionCount: questions ? Number(questions) : null,
  }
}

export function parseNoticeSyllabus(text: string): NoticeImportSubject[] {
  const subjects: NoticeImportSubject[] = []
  let current: NoticeImportSubject | null = null

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const header = line.match(HEADER)
    const headerName = header?.[1]?.trim() ?? ''
    const rest = header?.[3]?.trim() ?? ''
    const symbolBullet = /^[-•*▪●◦]\s+/.test(line)
    const numbered = /^\d{1,2}\s*[.)\-–]/.test(line)
    const looksLikeHeader =
      header != null &&
      !symbolBullet &&
      (isMostlyUppercase(headerName) || (!numbered && (rest === '' || INLINE_ITEM.test(rest))))

    if (header && looksLikeHeader) {
      current = {
        name: isMostlyUppercase(headerName) ? titleCase(headerName) : headerName,
        ...parseMeta(header[2]),
        topics: splitItems(rest),
      }
      subjects.push(current)
      continue
    }

    if (!current) {
      // Linha solta antes de qualquer disciplina: tratamos como cabeçalho.
      current = { name: cleanItem(line), weight: null, questionCount: null, topics: [] }
      subjects.push(current)
      continue
    }

    current.topics.push(...splitItems(line))
  }

  // Remove duplicatas preservando a ordem
  return subjects
    .map((s) => ({ ...s, topics: [...new Set(s.topics)] }))
    .filter((s) => s.name.length > 1)
}
