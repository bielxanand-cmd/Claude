import { htmlToText } from '@/lib/text'
import { escapeHtml } from './sanitize-html'
import type { SummaryContent } from './types'

/**
 * Temas de um assunto: subdivisões com resumo e pontos importantes próprios
 * (ex.: no assunto "Poder constituinte", os temas "Originário", "Reformador"…).
 * O resumo geral do assunto continua existindo; os temas o complementam.
 */
export interface Theme {
  id: string
  topicId: string
  title: string
  summary: string
  keyPoints: string
  /** Posição na lista (menor primeiro) */
  order: number
  createdAt: string
  updatedAt: string
}

export const sortThemes = (themes: Theme[]) => [...themes].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))

export const themeHasContent = (t: Pick<Theme, 'summary' | 'keyPoints'>) => !!(htmlToText(t.summary) || htmlToText(t.keyPoints))

/** Primeira linha do resumo do tema, para a prévia do cartão. */
export function themePreview(t: Theme, max = 140): string {
  const text = htmlToText(t.summary || t.keyPoints).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : text
}

/**
 * Junta os temas ao resumo geral (para mapa mental, flashcards, questões e
 * assistentes): cada tema vira um título com o seu resumo; os pontos
 * importantes do tema vão para os pontos importantes do assunto.
 */
export function withThemes(content: SummaryContent, themes: Theme[]): SummaryContent {
  const filled = sortThemes(themes).filter((t) => t.title.trim() && themeHasContent(t))
  if (filled.length === 0) return content
  const heading = (t: Theme) => `<h2>${escapeHtml(t.title.trim())}</h2>`
  return {
    ...content,
    summary: content.summary + filled.filter((t) => htmlToText(t.summary)).map((t) => heading(t) + t.summary).join(''),
    keyPoints: content.keyPoints + filled.filter((t) => htmlToText(t.keyPoints)).map((t) => heading(t) + t.keyPoints).join(''),
  }
}
