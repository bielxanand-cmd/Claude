import type { Contest, ContestSubject, ContestTopic, Subject, Summary, Topic, UserProfile, UserSelection, UserTopic } from '@/domain/types'
import type { Flashcard } from '@/domain/flashcards'
import type { CatalogRows } from '../seed'

/** Tudo o que é do usuário no modo local/nuvem. */
export interface UserState {
  profile: UserProfile
  selection: UserSelection | null
  /** Concursos já abertos, do mais recente para o mais antigo */
  history: UserSelection[]
  topics: Record<string, UserTopic>
  summaries: Record<string, Summary>
  /** Flashcards por assunto */
  flashcards: Record<string, Flashcard[]>
}

/** Catálogo criado pelo usuário (carreiras/cargos manuais e editais importados). */
export type CustomCatalog = { [K in keyof CatalogRows]: CatalogRows[K] }

/** Linhas que uma importação de edital acrescentou ao catálogo. */
export interface ImportRows {
  contest: Contest
  subjects: Subject[]
  topics: Topic[]
  contestSubjects: ContestSubject[]
  contestTopics: ContestTopic[]
}

export interface Snapshot {
  user: UserState
  catalog: CustomCatalog
}

export interface LoadedSnapshot {
  user: UserState | null
  catalog: CustomCatalog
}

/** O que mudou — permite que a nuvem grave só o documento afetado. */
export type Change =
  | { type: 'meta' } // perfil, concurso atual, histórico
  | { type: 'topic'; topicId: string }
  | { type: 'summary'; topicId: string }
  | { type: 'flashcards'; topicId: string }
  | { type: 'catalog-meta' } // carreiras e cargos manuais
  | { type: 'import'; rows: ImportRows }

/** Alteração vinda de outra aba/aparelho. */
export type RemoteChange = { type: 'topics'; topics: UserState['topics'] }

export interface Persistence {
  readonly kind: 'browser' | 'cloud'
  /** `null` quando não há nada salvo */
  load(): Promise<LoadedSnapshot | null>
  save(change: Change, snapshot: Snapshot): void
  /** Grava um estado inteiro (migração do navegador para a nuvem) */
  saveAll(snapshot: Snapshot): Promise<void>
  clear(): Promise<void>
  /** Recebe alterações feitas em outras abas/aparelhos (quando suportado) */
  subscribe?(listener: (change: RemoteChange) => void): () => void
}

export const emptyCatalog = (): CustomCatalog => ({
  careers: [],
  positions: [],
  contests: [],
  subjects: [],
  topics: [],
  contestSubjects: [],
  contestTopics: [],
})

/** Agrupa o catálogo personalizado por edital importado (para gravar um documento por edital). */
export function groupImports(catalog: CustomCatalog): ImportRows[] {
  const topicOwner = new Map<string, string>()
  const subjectOwner = new Map<string, string>()
  // Cada assunto/disciplina novo pertence ao primeiro edital que o citou
  for (const ct of catalog.contestTopics) if (!topicOwner.has(ct.topicId)) topicOwner.set(ct.topicId, ct.contestId)
  for (const cs of catalog.contestSubjects) if (!subjectOwner.has(cs.subjectId)) subjectOwner.set(cs.subjectId, cs.contestId)
  return catalog.contests.map((contest) => ({
    contest,
    subjects: catalog.subjects.filter((s) => subjectOwner.get(s.id) === contest.id),
    topics: catalog.topics.filter((t) => topicOwner.get(t.id) === contest.id),
    contestSubjects: catalog.contestSubjects.filter((cs) => cs.contestId === contest.id),
    contestTopics: catalog.contestTopics.filter((ct) => ct.contestId === contest.id),
  }))
}
