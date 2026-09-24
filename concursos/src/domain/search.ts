import type { PositionListItem } from '@/data/sources'
import { normalize } from '@/lib/text'
import type { StudyPlan, Summary } from './types'

export type SearchResult =
  | { kind: 'subject'; id: string; title: string; subtitle: string; icon: string; href: string }
  | { kind: 'topic'; id: string; title: string; subtitle: string; icon: string; href: string }
  | { kind: 'summary'; id: string; title: string; subtitle: string; icon: string; href: string }
  | { kind: 'position'; id: string; title: string; subtitle: string; icon: string; href: string }

export const SEARCH_GROUP_LABEL: Record<SearchResult['kind'], string> = {
  subject: 'Disciplinas',
  topic: 'Assuntos',
  summary: 'Resumos',
  position: 'Cargos',
}

function snippet(text: string, query: string, radius = 50): string {
  const idx = normalize(text).indexOf(query)
  if (idx < 0) return text.slice(0, radius * 2)
  const start = Math.max(0, idx - radius)
  return `${start > 0 ? '…' : ''}${text.slice(start, idx + query.length + radius)}${idx + query.length + radius < text.length ? '…' : ''}`
}

/** Busca global em disciplinas, assuntos e resumos do cargo atual e em todos os cargos. */
export function globalSearch(
  rawQuery: string,
  data: { plan: StudyPlan | null; summaries: Summary[]; positions: PositionListItem[] },
  limitPerGroup = 6,
): SearchResult[] {
  const query = normalize(rawQuery)
  if (query.length < 2) return []
  const terms = query.split(' ')
  const matches = (text: string) => {
    const n = normalize(text)
    return terms.every((t) => n.includes(t))
  }

  const subjects: SearchResult[] = []
  const topics: SearchResult[] = []
  const summaries: SearchResult[] = []
  const topicInfo = new Map<string, { name: string; subject: string; icon: string }>()

  for (const s of data.plan?.subjects ?? []) {
    if (matches(s.subject.name))
      subjects.push({
        kind: 'subject',
        id: s.subject.id,
        title: s.subject.name,
        subtitle: `${s.topics.length} assuntos`,
        icon: s.subject.icon,
        href: `/disciplina/${s.subject.id}`,
      })
    for (const t of s.topics) {
      topicInfo.set(t.topic.id, { name: t.topic.name, subject: s.subject.name, icon: s.subject.icon })
      if (matches(t.topic.name) || matches(`${s.subject.name} ${t.topic.name}`))
        topics.push({ kind: 'topic', id: t.topic.id, title: t.topic.name, subtitle: s.subject.name, icon: s.subject.icon, href: `/assunto/${t.topic.id}` })
    }
  }

  for (const summary of data.summaries) {
    const info = topicInfo.get(summary.topicId)
    if (!info || !matches(summary.plainText)) continue
    summaries.push({
      kind: 'summary',
      id: summary.topicId,
      title: info.name,
      subtitle: snippet(summary.plainText, terms[0]),
      icon: info.icon,
      href: `/assunto/${summary.topicId}`,
    })
  }

  const positions: SearchResult[] = data.positions
    .filter((p) => matches(`${p.position.name} ${p.career.name}`))
    .map((p) => ({
      kind: 'position',
      id: p.position.id,
      title: p.position.name,
      subtitle: `${p.career.name} · ${p.contests.length} ${p.contests.length === 1 ? 'edital' : 'editais'}`,
      icon: p.career.icon,
      href: `/cargo/${p.position.id}`,
    }))

  return [
    ...subjects.slice(0, limitPerGroup),
    ...topics.slice(0, limitPerGroup * 2),
    ...summaries.slice(0, limitPerGroup),
    ...positions.slice(0, limitPerGroup),
  ]
}
