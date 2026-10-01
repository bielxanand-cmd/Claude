import type { PlanTopic, StudyPlan } from './types'

/**
 * Assunto criado pelo próprio estudante dentro de uma disciplina do plano
 * (algo que os editais não listam, mas que ele quer estudar). Fica ligado
 * ao cargo e não conta como edital.
 */
export interface ManualTopic {
  /** Id do assunto (prefixo `manual-`) */
  id: string
  positionId: string
  subjectId: string
  name: string
  /** O que estudar (aparece como "O que o edital cobra") */
  details: string[]
  createdAt: string
}

/** Acrescenta os assuntos manuais do cargo ao fim de cada disciplina do plano. */
export function withManualTopics(plan: StudyPlan, manual: ManualTopic[]): StudyPlan {
  const mine = manual.filter((m) => m.positionId === plan.position.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  if (mine.length === 0) return plan
  return {
    ...plan,
    subjects: plan.subjects.map((s) => {
      const extra = mine.filter((m) => m.subjectId === s.subject.id)
      if (extra.length === 0) return s
      const base = s.topics.length
      const topics: PlanTopic[] = extra.map((m, i) => ({
        topic: { id: m.id, subjectId: m.subjectId, name: m.name, order: 10_000 + base + i },
        frequency: 0,
        contestIds: [],
        details: m.details,
        manual: true,
      }))
      return { ...s, topics: [...s.topics, ...topics] }
    }),
  }
}
