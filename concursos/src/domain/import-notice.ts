import type { Contest, ContestSubject, ContestTopic, NoticeImport, Subject, Topic } from './types'
import { normalize, slugify } from '@/lib/text'

export interface ImportResult {
  contest: Contest
  newSubjects: Subject[]
  newTopics: Topic[]
  contestSubjects: ContestSubject[]
  contestTopics: ContestTopic[]
}

/**
 * Transforma um edital de entrada em linhas do catálogo, reaproveitando
 * disciplinas e assuntos já existentes (comparação sem acentos/caixa).
 * É o ponto único usado por todos os canais de importação.
 */
export function planNoticeImport(
  input: NoticeImport,
  existing: { subjects: Subject[]; topics: Topic[] },
  newId: () => string,
): ImportResult {
  const contest: Contest = { ...input.contest, id: newId(), positionId: input.positionId }
  const subjectByName = new Map(existing.subjects.map((s) => [normalize(s.name), s]))
  const topicByKey = new Map(existing.topics.map((t) => [`${t.subjectId}|${normalize(t.name)}`, t]))
  const newSubjects: Subject[] = []
  const newTopics: Topic[] = []
  const contestSubjects: ContestSubject[] = []
  const contestTopics: ContestTopic[] = []

  for (const item of input.subjects) {
    const name = item.name.trim()
    if (!name) continue
    let subject = subjectByName.get(normalize(name))
    if (!subject) {
      const slug = slugify(name)
      subject = { id: `${slug}-${newId().slice(0, 6)}`, slug, name, icon: guessSubjectIcon(name) }
      subjectByName.set(normalize(name), subject)
      newSubjects.push(subject)
    }
    if (contestSubjects.some((cs) => cs.subjectId === subject.id)) continue
    contestSubjects.push({
      contestId: contest.id,
      subjectId: subject.id,
      weight: item.weight ?? null,
      questionCount: item.questionCount ?? null,
    })

    const orderBase = existing.topics.filter((t) => t.subjectId === subject.id).length + newTopics.filter((t) => t.subjectId === subject.id).length
    item.topics.forEach(({ name: rawTopic, details = [] }, index) => {
      const topicName = rawTopic.trim()
      if (!topicName) return
      const key = `${subject.id}|${normalize(topicName)}`
      let topic = topicByKey.get(key)
      if (!topic) {
        topic = { id: `${subject.id}__${slugify(topicName).slice(0, 60)}-${newId().slice(0, 6)}`, subjectId: subject.id, name: topicName, order: orderBase + index }
        topicByKey.set(key, topic)
        newTopics.push(topic)
      }
      const link = contestTopics.find((ct) => ct.topicId === topic.id)
      if (link) link.details = [...new Set([...(link.details ?? []), ...details])]
      else contestTopics.push({ contestId: contest.id, topicId: topic.id, details: [...details] })
    })
  }

  return { contest, newSubjects, newTopics, contestSubjects, contestTopics }
}

/** Ícone sugerido para disciplinas novas, a partir do nome. */
export function guessSubjectIcon(name: string): string {
  const n = normalize(name)
  const rules: [RegExp, string][] = [
    [/portugues|lingua|redacao|ingles|espanhol|literatura/, 'languages'],
    [/constitucional/, 'landmark'],
    [/processual|processo/, 'gavel'],
    [/penal|criminal|policia|seguranca publica/, 'shield'],
    [/administrativo|administracao/, 'building-2'],
    [/tributari|fiscal|icms/, 'receipt'],
    [/civil|direito|legislacao|lei|etica|humanos/, 'scale'],
    [/contab|custos|financeira|matematica|estatistica|fisica/, 'calculator'],
    [/raciocinio|logic/, 'brain'],
    [/informatica|computa|tecnologia|dados|software|redes/, 'monitor'],
    [/economia|mercado/, 'trending-up'],
    [/auditoria|controle/, 'search-check'],
    [/geografia|geopolitica|atualidades|historia/, 'globe'],
    [/orcament|afo/, 'wallet'],
    [/transito/, 'file-text'],
    [/saude|enfermagem|medic/, 'heart-pulse'],
    [/educacao|pedagog/, 'graduation-cap'],
    [/bancari|banco/, 'banknote'],
  ]
  return rules.find(([re]) => re.test(n))?.[1] ?? 'book-open'
}
