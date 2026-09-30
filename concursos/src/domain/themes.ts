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
  /** Tema ao qual este subtema pertence (`null`/ausente: tema principal) */
  parentId?: string | null
  /** Posição na lista (menor primeiro) */
  order: number
  createdAt: string
  updatedAt: string
}

export const sortThemes = (themes: Theme[]) => [...themes].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))

export const themeHasContent = (t: Pick<Theme, 'summary' | 'keyPoints'>) => !!(htmlToText(t.summary) || htmlToText(t.keyPoints))

/** Temas principais (sem pai), em ordem. */
export const rootThemes = (themes: Theme[]) => sortThemes(themes.filter((t) => !t.parentId))

/** Subtemas de um tema, em ordem. */
export const subthemesOf = (themes: Theme[], parentId: string) => sortThemes(themes.filter((t) => t.parentId === parentId))

/** Tema com conteúdo próprio ou em algum subtema. */
export const treeHasContent = (theme: Theme, themes: Theme[]) => themeHasContent(theme) || subthemesOf(themes, theme.id).some(themeHasContent)

/**
 * HTML de um tema com os subtemas (cada subtema como título de nível 3,
 * com o seu resumo e pontos importantes).
 */
export function themeTreeHtml(theme: Theme, themes: Theme[], part: 'summary' | 'keyPoints' | 'all' = 'all'): string {
  const pick = (t: Theme) => (part === 'all' ? t.summary + t.keyPoints : t[part])
  const subs = subthemesOf(themes, theme.id)
    .filter((s) => s.title.trim() && htmlToText(pick(s)))
    .map((s) => `<h3>${escapeHtml(s.title.trim())}</h3>${pick(s)}`)
    .join('')
  return (part === 'all' ? theme.summary : pick(theme)) + subs
}

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
  const filled = rootThemes(themes).filter((t) => t.title.trim() && treeHasContent(t, themes))
  if (filled.length === 0) return content
  const block = (part: 'summary' | 'keyPoints') =>
    filled
      .map((t) => ({ t, html: themeTreeHtml(t, themes, part) }))
      .filter(({ html }) => htmlToText(html))
      .map(({ t, html }) => `<h2>${escapeHtml(t.title.trim())}</h2>${html}`)
      .join('')
  return { ...content, summary: content.summary + block('summary'), keyPoints: content.keyPoints + block('keyPoints') }
}
