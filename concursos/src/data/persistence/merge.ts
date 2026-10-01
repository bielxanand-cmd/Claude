import { newerTopic } from './cloud'
import type { CustomCatalog, Snapshot, UserState } from './types'

/**
 * Junta o que ficou salvo só neste navegador (quando a conta não pôde ser
 * carregada) com o que está na conta: vence a versão mais recente de cada
 * item; o que só existe de um lado é mantido.
 */

const max = (values: (string | null | undefined)[]) => values.filter((v): v is string => !!v).sort().at(-1) ?? ''

/** Momento da alteração mais recente registrada no estado do usuário. */
export function latestChange(user: UserState | null | undefined): string {
  if (!user) return ''
  return max([
    user.selection?.createdAt,
    ...(user.history ?? []).map((h) => h.createdAt),
    ...Object.values(user.topics ?? {}).flatMap((t) => [t.updatedAt, t.completedAt, t.lastAccessedAt]),
    ...Object.values(user.summaries ?? {}).map((s) => s.updatedAt),
    ...Object.values(user.themes ?? {}).flat().map((t) => t.updatedAt),
    ...Object.values(user.questionNotes ?? {}).flat().map((n) => n.updatedAt),
    ...Object.values(user.attachments ?? {}).flat().map((a) => a.createdAt),
    ...Object.values(user.manualTopics ?? {}).map((m) => m.createdAt),
    ...Object.values(user.quizzes ?? {}).map((q) => q.generatedAt),
  ])
}

/** Listas por chave: une por id, a mais recente vence. */
function unionById<T extends { id: string }>(a: T[] = [], b: T[] = [], stamp: (x: T) => string = () => ''): T[] {
  const out = new Map(a.map((x) => [x.id, x]))
  for (const x of b) {
    const cur = out.get(x.id)
    if (!cur || stamp(x) >= stamp(cur)) out.set(x.id, x)
  }
  return [...out.values()]
}

function mergeRecordOfLists<T extends { id: string }>(a: Record<string, T[]> = {}, b: Record<string, T[]> = {}, stamp: (x: T) => string) {
  const out: Record<string, T[]> = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) out[key] = unionById(a[key], b[key], stamp)
  return out
}

export function mergeUser(cloud: UserState, local: UserState): UserState {
  const selection = !cloud.selection ? local.selection : !local.selection ? cloud.selection : local.selection.createdAt >= cloud.selection.createdAt ? local.selection : cloud.selection
  const history = [...(local.history ?? []), ...(cloud.history ?? [])]
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    .filter((h, i, all) => all.findIndex((o) => o.positionId === h.positionId) === i)
    .slice(0, 20)

  const topics: UserState['topics'] = { ...cloud.topics }
  for (const [id, t] of Object.entries(local.topics ?? {})) topics[id] = newerTopic(topics[id], t) ?? t

  const summaries: UserState['summaries'] = { ...cloud.summaries }
  for (const [id, s] of Object.entries(local.summaries ?? {})) if (!summaries[id] || s.updatedAt >= summaries[id].updatedAt) summaries[id] = s

  return {
    profile: cloud.profile ?? local.profile,
    selection,
    history,
    topics,
    summaries,
    // Sem data de alteração: o lado deste navegador (mais recente) vence por assunto
    flashcards: { ...cloud.flashcards, ...local.flashcards },
    quizzes: { ...cloud.quizzes, ...local.quizzes },
    themes: mergeRecordOfLists(cloud.themes, local.themes, (t) => t.updatedAt),
    attachments: mergeRecordOfLists(cloud.attachments, local.attachments, (a) => a.createdAt),
    questionNotes: mergeRecordOfLists(cloud.questionNotes, local.questionNotes, (n) => n.updatedAt),
    manualTopics: { ...cloud.manualTopics, ...local.manualTopics },
  }
}

export function mergeCatalog(cloud: CustomCatalog, local: CustomCatalog): CustomCatalog {
  const byKey = <T>(a: T[], b: T[], key: (x: T) => string) => [...new Map([...a, ...b].map((x) => [key(x), x])).values()]
  return {
    careers: unionById(cloud.careers, local.careers),
    positions: unionById(cloud.positions, local.positions),
    contests: unionById(cloud.contests, local.contests),
    subjects: unionById(cloud.subjects, local.subjects),
    topics: unionById(cloud.topics, local.topics),
    contestSubjects: byKey(cloud.contestSubjects, local.contestSubjects, (x) => `${x.contestId}|${x.subjectId}`),
    contestTopics: byKey(cloud.contestTopics, local.contestTopics, (x) => `${x.contestId}|${x.topicId}`),
  }
}

export function mergeSnapshots(cloud: Snapshot, local: Snapshot): Snapshot {
  return { user: mergeUser(cloud.user, local.user), catalog: mergeCatalog(cloud.catalog, local.catalog) }
}
