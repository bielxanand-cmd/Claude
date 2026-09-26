/**
 * Tipos de domínio do aplicativo.
 *
 * Modelo principal (espelha o schema do Supabase em `supabase/migrations`):
 *
 *   Carreira ─┬─ Cargo ─── Concurso/Edital ─┬─ Disciplina do edital (peso, nº de questões)
 *             │                             └─ Assunto do edital
 *             └─ ...
 *
 *   Usuário ── Cargo selecionado ── progresso por assunto ── resumos
 *
 * A estrutura de estudo de um cargo NÃO é cadastrada à mão: ela é consolidada a
 * partir dos editais (concursos) vinculados ao cargo — ver `consolidate.ts`.
 */

export type Sphere = 'federal' | 'estadual' | 'municipal'

export type TopicStatus = 'not_started' | 'in_progress' | 'completed'

/**
 * De onde veio um edital. Permite alimentar a base por diferentes canais
 * mantendo a rastreabilidade da fonte.
 */
export type NoticeOrigin =
  | 'demo' // dados demonstrativos (não oficiais)
  | 'curated' // base previamente cadastrada e revisada
  | 'import' // importação de texto do edital
  | 'pdf' // upload de PDF (futuro)
  | 'api' // integração com fonte externa (futuro)
  | 'manual' // cadastro manual pelo usuário

export interface Career {
  id: string
  slug: string
  name: string
  description: string
  icon: string
  isCustom?: boolean
}

export interface Position {
  id: string
  careerId: string
  name: string
  description: string
  spheres: Sphere[]
  isCustom?: boolean
}

export interface Contest {
  id: string
  positionId: string
  /** Nome do concurso, ex.: "Concurso SEFAZ SP" */
  name: string
  /** Órgão, ex.: "Secretaria da Fazenda de São Paulo" */
  organization: string
  /** Sigla curta do órgão, ex.: "SEFAZ SP" */
  organizationShort: string
  sphere: Sphere
  /** UF, quando estadual/municipal */
  state: string | null
  city: string | null
  year: number | null
  examBoard: string | null
  noticeUrl: string | null
  noticeDate: string | null
  origin: NoticeOrigin
}

export interface Subject {
  id: string
  slug: string
  name: string
  icon: string
}

export interface Topic {
  id: string
  subjectId: string
  name: string
  /** Ordem sugerida dentro da disciplina */
  order: number
}

export interface ContestSubject {
  contestId: string
  subjectId: string
  weight: number | null
  questionCount: number | null
}

export interface ContestTopic {
  contestId: string
  topicId: string
  /** Subitens com que o edital detalha o assunto */
  details?: string[]
}

/** Linhas brutas necessárias para consolidar o plano de um cargo. */
export interface CatalogSnapshot {
  career: Career
  position: Position
  contests: Contest[]
  subjects: Subject[]
  topics: Topic[]
  contestSubjects: ContestSubject[]
  contestTopics: ContestTopic[]
}

/* -------------------------------------------------------------------------- */
/* Plano de estudos consolidado                                               */
/* -------------------------------------------------------------------------- */

export interface PlanTopic {
  topic: Topic
  /** Fração (0–1) dos editais do cargo em que o assunto apareceu */
  frequency: number
  /** Editais em que o assunto apareceu */
  contestIds: string[]
  /** Subitens citados pelos editais (sem repetição) */
  details: string[]
}

export interface PlanSubject {
  subject: Subject
  /** Peso médio nos editais em que a disciplina apareceu (quando informado) */
  weight: number | null
  /** Média de questões nos editais (quando informado) */
  questionCount: number | null
  /** Fração (0–1) dos editais em que a disciplina apareceu */
  frequency: number
  /** Editais utilizados como fonte */
  contestIds: string[]
  topics: PlanTopic[]
}

export interface StudyPlan {
  career: Career
  position: Position
  contests: Contest[]
  subjects: PlanSubject[]
  /** true quando algum edital da base é demonstrativo */
  hasDemoData: boolean
}

/* -------------------------------------------------------------------------- */
/* Dados do usuário                                                           */
/* -------------------------------------------------------------------------- */

export interface UserProfile {
  id: string
  name: string
  email: string | null
  createdAt: string
}

export interface UserSelection {
  positionId: string
  sphere: Sphere
  state: string | null
  createdAt: string
}

export interface UserTopic {
  topicId: string
  status: TopicStatus
  lastStudiedAt: string | null
  completedAt: string | null
  lastAccessedAt: string | null
  /** Última alteração (resolve conflitos entre abas/dispositivos) */
  updatedAt?: string | null
}

export interface SummaryContent {
  /** Todas as seções são HTML gerado pelo editor rico */
  summary: string
  keyPoints: string
  pitfalls: string
  notes: string
}

export interface Summary {
  topicId: string
  content: SummaryContent
  /** Texto plano derivado do conteúdo, usado na busca */
  plainText: string
  updatedAt: string
}

/* -------------------------------------------------------------------------- */
/* Importação de edital                                                       */
/* -------------------------------------------------------------------------- */

export interface NoticeImportTopic {
  name: string
  /** Subitens do edital para este assunto (ex.: 4.1, 4.2) */
  details?: string[]
}

export interface NoticeImportSubject {
  name: string
  weight?: number | null
  questionCount?: number | null
  topics: NoticeImportTopic[]
}

/**
 * Formato canônico de entrada para qualquer canal de alimentação da base
 * (seed, texto colado, PDF, API). Todos convergem para `importNotice`.
 */
export interface NoticeImport {
  positionId: string
  contest: Omit<Contest, 'id' | 'positionId'>
  subjects: NoticeImportSubject[]
}
