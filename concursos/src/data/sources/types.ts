import type { Flashcard } from '@/domain/flashcards'
import type {
  Career,
  CatalogSnapshot,
  Contest,
  NoticeImport,
  Position,
  Sphere,
  Summary,
  SummaryContent,
  UserProfile,
  UserSelection,
  UserTopic,
} from '@/domain/types'

export interface PositionListItem {
  position: Position
  career: Career
  contests: Contest[]
}

export interface PositionFilter {
  careerId?: string
  sphere?: Sphere
}

/**
 * Contrato de acesso a dados. Há duas implementações:
 *  - `local`: seed demonstrativo + localStorage (funciona sem backend);
 *  - `supabase`: banco Postgres descrito em `supabase/migrations`.
 *
 * As telas nunca acessam uma implementação diretamente: tudo passa pelos
 * hooks de `src/data/queries.ts`.
 */
export interface DataSource {
  readonly kind: 'local' | 'supabase'

  // Catálogo (carreiras, cargos, editais)
  listCareers(): Promise<Career[]>
  listPositions(filter?: PositionFilter): Promise<PositionListItem[]>
  getCatalogSnapshot(positionId: string): Promise<CatalogSnapshot | null>
  createCareer(input: { name: string; description?: string }): Promise<Career>
  createPosition(input: { careerId: string; name: string; description?: string; spheres: Sphere[] }): Promise<Position>
  importNotice(input: NoticeImport): Promise<Contest>

  // Usuário
  getProfile(): Promise<UserProfile>
  updateProfile(patch: Partial<Pick<UserProfile, 'name' | 'email'>>): Promise<UserProfile>
  getSelection(): Promise<UserSelection | null>
  setSelection(selection: Omit<UserSelection, 'createdAt'> | null): Promise<UserSelection | null>
  /** Concursos já abertos pelo usuário, do mais recente para o mais antigo */
  listRecentSelections(): Promise<UserSelection[]>
  /** Remove um concurso do histórico (o progresso dos assuntos é mantido) */
  forgetSelection(positionId: string): Promise<void>
  listUserTopics(): Promise<UserTopic[]>
  updateUserTopic(topicId: string, patch: Partial<Omit<UserTopic, 'topicId'>>): Promise<UserTopic>
  listSummaries(): Promise<Summary[]>
  saveSummary(topicId: string, content: SummaryContent): Promise<Summary>
  deleteSummary(topicId: string): Promise<void>
  listFlashcards(): Promise<Flashcard[]>
  /** Substitui os flashcards de um assunto (inclui o estado de revisão) */
  saveTopicFlashcards(topicId: string, cards: Flashcard[]): Promise<Flashcard[]>
  resetUserData(): Promise<void>
  /** Avisa quando dados mudam fora desta página (outra aba/aparelho) */
  subscribe?(listener: (what: 'userTopics') => void): () => void
}
