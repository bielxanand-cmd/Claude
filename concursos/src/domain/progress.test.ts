import { describe, expect, it } from 'vitest'
import { buildSeedRows } from '@/data/seed'
import { consolidateStudyPlan } from './consolidate'
import { planProgress, subjectProgress, subjectsNeedingAttention, toStatusMap } from './progress'
import type { CatalogSnapshot, UserTopic } from './types'

function snapshotFor(positionId: string): CatalogSnapshot {
  const rows = buildSeedRows()
  const position = rows.positions.find((p) => p.id === positionId)!
  const contests = rows.contests.filter((c) => c.positionId === positionId)
  const ids = new Set(contests.map((c) => c.id))
  return {
    career: rows.careers.find((c) => c.id === position.careerId)!,
    position,
    contests,
    subjects: rows.subjects,
    topics: rows.topics,
    contestSubjects: rows.contestSubjects.filter((cs) => ids.has(cs.contestId)),
    contestTopics: rows.contestTopics.filter((ct) => ids.has(ct.contestId)),
  }
}

const done = (topicId: string): UserTopic => ({ topicId, status: 'completed', lastStudiedAt: null, completedAt: null, lastAccessedAt: null })

describe('consolidação de editais', () => {
  const plan = consolidateStudyPlan(snapshotFor('auditor-fiscal-estadual'))

  it('une disciplinas e assuntos de todos os editais do cargo, com fontes', () => {
    expect(plan.contests).toHaveLength(5)
    expect(plan.subjects.map((s) => s.subject.name)).toContain('Direito Tributário')
    const tributario = plan.subjects.find((s) => s.subject.id === 'direito-tributario')!
    expect(tributario.frequency).toBe(1)
    expect(tributario.weight).toBe(2)
    // "Dívida ativa" foi omitida em dois editais (MG e RS)
    const divida = tributario.topics.find((t) => t.topic.name === 'Dívida ativa')!
    expect(divida.contestIds.sort()).toEqual(['demo-sefaz-ba-auditor', 'demo-sefaz-pr-auditor', 'demo-sefaz-sp-auditor'])
    expect(divida.frequency).toBeCloseTo(0.6)
    expect(plan.hasDemoData).toBe(true)
  })

  it('não inclui disciplinas que não aparecem em nenhum edital do cargo', () => {
    expect(plan.subjects.some((s) => s.subject.id === 'direito-penal')).toBe(false)
  })

  it('ordena assuntos por frequência nos editais', () => {
    for (const subject of plan.subjects) {
      const freqs = subject.topics.map((t) => t.frequency)
      expect(freqs).toEqual([...freqs].sort((a, b) => b - a))
    }
  })
})

describe('progresso', () => {
  const plan = consolidateStudyPlan(snapshotFor('auditor-fiscal-estadual'))
  const tributario = plan.subjects.find((s) => s.subject.id === 'direito-tributario')!

  it('disciplina = concluídos / total da disciplina', () => {
    const statuses = toStatusMap(tributario.topics.slice(0, 8).map((t) => done(t.topic.id)))
    const p = subjectProgress(tributario, statuses)
    expect(p).toMatchObject({ total: 16, completed: 8, ratio: 0.5 })
  })

  it('geral = soma de todos os assuntos de todas as disciplinas', () => {
    const total = plan.subjects.reduce((n, s) => n + s.topics.length, 0)
    const statuses = toStatusMap(tributario.topics.map((t) => done(t.topic.id)))
    const p = planProgress(plan, statuses)
    expect(p.total).toBe(total)
    expect(p.completed).toBe(16)
    expect(p.ratio).toBeCloseTo(16 / total)
  })

  it('só aponta disciplinas atrasadas depois que o estudo começou', () => {
    expect(subjectsNeedingAttention(plan, new Map())).toEqual([])
    const statuses = toStatusMap(tributario.topics.map((t) => done(t.topic.id)))
    expect(subjectsNeedingAttention(plan, statuses).length).toBeGreaterThan(0)
  })
})
