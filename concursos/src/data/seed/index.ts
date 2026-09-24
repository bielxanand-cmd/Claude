import type { Contest, ContestSubject, ContestTopic, Subject, Topic } from '@/domain/types'
import { slugify } from '@/lib/text'
import { SEED_CAREERS, SEED_POSITIONS } from './catalog'
import { SEED_CONTESTS } from './contests'
import { SEED_SUBJECTS } from './subjects'

export const topicId = (subjectSlug: string, topicName: string) => `${subjectSlug}__${slugify(topicName)}`

export interface CatalogRows {
  careers: typeof SEED_CAREERS
  positions: typeof SEED_POSITIONS
  contests: Contest[]
  subjects: Subject[]
  topics: Topic[]
  contestSubjects: ContestSubject[]
  contestTopics: ContestTopic[]
}

/** Converte o seed compacto em linhas normalizadas (mesmo formato do banco). */
export function buildSeedRows(): CatalogRows {
  const subjects: Subject[] = SEED_SUBJECTS.map((s) => ({ id: s.slug, slug: s.slug, name: s.name, icon: s.icon }))
  const topics: Topic[] = SEED_SUBJECTS.flatMap((s) =>
    s.topics.map((name, order) => ({ id: topicId(s.slug, name), subjectId: s.slug, name, order })),
  )
  const subjectBySlug = new Map(SEED_SUBJECTS.map((s) => [s.slug, s]))

  const contests: Contest[] = []
  const contestSubjects: ContestSubject[] = []
  const contestTopics: ContestTopic[] = []

  for (const c of SEED_CONTESTS) {
    contests.push({
      id: c.id,
      positionId: c.positionId,
      name: `Edital demonstrativo — ${c.organizationShort}`,
      organization: c.organization,
      organizationShort: c.organizationShort,
      sphere: c.sphere,
      state: c.state,
      city: c.city ?? null,
      year: c.year,
      examBoard: null,
      noticeUrl: null,
      noticeDate: null,
      origin: 'demo',
    })
    for (const [slug, weight, questions, omit = []] of c.subjects) {
      const subject = subjectBySlug.get(slug)
      if (!subject) throw new Error(`Disciplina desconhecida no seed: ${slug}`)
      contestSubjects.push({ contestId: c.id, subjectId: slug, weight, questionCount: questions })
      subject.topics.forEach((name, index) => {
        if (!omit.includes(index)) contestTopics.push({ contestId: c.id, topicId: topicId(slug, name) })
      })
    }
  }

  return { careers: SEED_CAREERS, positions: SEED_POSITIONS, contests, subjects, topics, contestSubjects, contestTopics }
}
