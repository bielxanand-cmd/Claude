import { normalize } from '@/lib/text'
import type { CatalogSnapshot, PlanSubject, PlanTopic, StudyPlan } from './types'

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

/**
 * Consolida os editais de um cargo em um plano de estudos único.
 *
 * - Uma disciplina entra no plano se aparece em ao menos um edital do cargo.
 * - Um assunto entra no plano se aparece em ao menos um edital do cargo.
 * - Para cada disciplina/assunto são mantidas as referências dos editais-fonte
 *   e a frequência (em quantos editais apareceu).
 * - Disciplinas são ordenadas por frequência, peso e nome; assuntos por
 *   frequência e pela ordem sugerida.
 */
export function consolidateStudyPlan(snapshot: CatalogSnapshot): StudyPlan {
  const { career, position, contests, subjects, topics, contestSubjects, contestTopics } = snapshot
  const contestIds = new Set(contests.map((c) => c.id))
  const totalContests = contests.length

  const topicById = new Map(topics.map((t) => [t.id, t]))

  // assunto -> editais em que aparece (e subitens citados)
  const topicContests = new Map<string, Set<string>>()
  const topicDetails = new Map<string, Map<string, string>>()
  for (const ct of contestTopics) {
    if (!contestIds.has(ct.contestId) || !topicById.has(ct.topicId)) continue
    const set = topicContests.get(ct.topicId) ?? new Set<string>()
    set.add(ct.contestId)
    topicContests.set(ct.topicId, set)
    if (ct.details?.length) {
      const details = topicDetails.get(ct.topicId) ?? new Map<string, string>()
      for (const d of ct.details) if (!details.has(normalize(d))) details.set(normalize(d), d)
      topicDetails.set(ct.topicId, details)
    }
  }

  const planSubjects: PlanSubject[] = []
  for (const subject of subjects) {
    const links = contestSubjects.filter((cs) => cs.subjectId === subject.id && contestIds.has(cs.contestId))
    const subjectTopics = topics.filter((t) => t.subjectId === subject.id && topicContests.has(t.id))
    if (links.length === 0 && subjectTopics.length === 0) continue

    const sourceIds = new Set(links.map((l) => l.contestId))
    const planTopics: PlanTopic[] = subjectTopics.map((topic) => {
      const ids = [...(topicContests.get(topic.id) ?? [])]
      ids.forEach((id) => sourceIds.add(id))
      return {
        topic,
        contestIds: ids,
        details: [...(topicDetails.get(topic.id)?.values() ?? [])],
        frequency: totalContests ? ids.length / totalContests : 0,
      }
    })
    planTopics.sort((a, b) => b.frequency - a.frequency || a.topic.order - b.topic.order)

    planSubjects.push({
      subject,
      weight: average(links.map((l) => l.weight).filter((w): w is number => w != null)),
      questionCount: average(links.map((l) => l.questionCount).filter((q): q is number => q != null)),
      frequency: totalContests ? sourceIds.size / totalContests : 0,
      contestIds: [...sourceIds],
      topics: planTopics,
    })
  }

  planSubjects.sort(
    (a, b) =>
      b.frequency - a.frequency ||
      (b.weight ?? 0) - (a.weight ?? 0) ||
      a.subject.name.localeCompare(b.subject.name, 'pt-BR'),
  )

  return {
    career,
    position,
    contests: [...contests].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    subjects: planSubjects,
    hasDemoData: contests.some((c) => c.origin === 'demo'),
  }
}
