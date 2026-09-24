import type { PlanSubject, StudyPlan, TopicStatus, UserTopic } from './types'

export interface Progress {
  total: number
  completed: number
  inProgress: number
  pending: number
  /** 0–1 */
  ratio: number
}

export type StatusMap = Map<string, UserTopic>

export function statusOf(statuses: StatusMap, topicId: string): TopicStatus {
  return statuses.get(topicId)?.status ?? 'not_started'
}

export function computeProgress(topicIds: string[], statuses: StatusMap): Progress {
  let completed = 0
  let inProgress = 0
  for (const id of topicIds) {
    const status = statusOf(statuses, id)
    if (status === 'completed') completed++
    else if (status === 'in_progress') inProgress++
  }
  const total = topicIds.length
  return {
    total,
    completed,
    inProgress,
    pending: total - completed,
    ratio: total === 0 ? 0 : completed / total,
  }
}

/** Progresso da disciplina = assuntos concluídos / total de assuntos da disciplina. */
export function subjectProgress(subject: PlanSubject, statuses: StatusMap): Progress {
  return computeProgress(
    subject.topics.map((t) => t.topic.id),
    statuses,
  )
}

/** Progresso geral = soma de todos os assuntos de todas as disciplinas do cargo. */
export function planProgress(plan: StudyPlan, statuses: StatusMap): Progress {
  return computeProgress(
    plan.subjects.flatMap((s) => s.topics.map((t) => t.topic.id)),
    statuses,
  )
}

export function toStatusMap(userTopics: UserTopic[]): StatusMap {
  return new Map(userTopics.map((ut) => [ut.topicId, ut]))
}

/**
 * Disciplinas que precisam de atenção: progresso abaixo da média geral,
 * priorizando as de maior peso/frequência nos editais.
 */
export function subjectsNeedingAttention(plan: StudyPlan, statuses: StatusMap, limit = 3) {
  const overall = planProgress(plan, statuses).ratio
  // Sem nenhum assunto concluído não há "atraso" relativo a apontar.
  if (overall === 0) return []
  return plan.subjects
    .map((subject) => ({ subject, progress: subjectProgress(subject, statuses) }))
    .filter(({ progress }) => progress.total > 0 && progress.ratio < 1 && progress.ratio <= overall)
    .sort(
      (a, b) =>
        a.progress.ratio - b.progress.ratio ||
        (b.subject.weight ?? 0) - (a.subject.weight ?? 0) ||
        b.subject.frequency - a.subject.frequency,
    )
    .slice(0, limit)
}

/**
 * Próximos assuntos sugeridos: primeiro os "em andamento", depois os não
 * iniciados mais frequentes nos editais, alternando disciplinas.
 */
export function nextTopics(plan: StudyPlan, statuses: StatusMap, limit = 5) {
  const candidates = plan.subjects.flatMap((subject) =>
    subject.topics
      .filter((t) => statusOf(statuses, t.topic.id) !== 'completed')
      .map((t, index) => ({ subject, planTopic: t, index, status: statusOf(statuses, t.topic.id) })),
  )
  candidates.sort(
    (a, b) =>
      Number(b.status === 'in_progress') - Number(a.status === 'in_progress') ||
      a.index - b.index ||
      b.planTopic.frequency - a.planTopic.frequency,
  )
  return candidates.slice(0, limit)
}
