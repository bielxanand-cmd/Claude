import { htmlToText } from '@/lib/text'

/**
 * Anotações de questões de um assunto (caderno de erros): o que a questão
 * cobrava, o que o estudante marcou e por que errou. Cada anotação pode
 * ser marcada com um tema e um subtema do assunto, para filtrar depois.
 */
export interface QuestionNote {
  id: string
  topicId: string
  /** Tema do assunto (opcional) */
  themeId: string | null
  /** Subtema do tema (opcional) */
  subthemeId: string | null
  html: string
  createdAt: string
  updatedAt: string
}

/** Filtro: todas, sem tema, um tema (com seus subtemas) ou um subtema. */
export type NoteFilter = { kind: 'all' } | { kind: 'none' } | { kind: 'theme'; themeId: string } | { kind: 'subtheme'; subthemeId: string }

export function filterNotes(notes: QuestionNote[], filter: NoteFilter): QuestionNote[] {
  switch (filter.kind) {
    case 'all':
      return notes
    case 'none':
      return notes.filter((n) => !n.themeId)
    case 'theme':
      return notes.filter((n) => n.themeId === filter.themeId)
    case 'subtheme':
      return notes.filter((n) => n.subthemeId === filter.subthemeId)
  }
}

export const sortNotes = (notes: QuestionNote[]) => [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export function notePreview(note: QuestionNote, max = 160): string {
  const text = htmlToText(note.html).replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : text
}
