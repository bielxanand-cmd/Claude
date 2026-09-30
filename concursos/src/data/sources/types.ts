import type { Flashcard } from '@/domain/flashcards'
import type { Quiz } from '@/domain/questions'
import type { Theme } from '@/domain/themes'
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
  listQuizzes(): Promise<Quiz[]>
  /** Salva (ou remove, com `null`) as questões de um assunto */
  saveQuiz(topicId: string, quiz: Quiz | null): Promise<Quiz | null>
  listThemes(): Promise<Theme[]>
  /** Cria ou atualiza um tema de um assunto */
  saveTheme(theme: Theme): Promise<Theme>
  deleteTheme(topicId: string, themeId: string): Promise<void>
  resetUserData(): Promise<void>
  /** Avisa quando dados mudam fora desta página (outra aba/aparelho) */
  subscribe?(listener: (what: 'userTopics' | 'all') => void): () => void
  /**
   * Recarrega os dados salvos na conta (o que foi feito em outro aparelho).
   * Resolve `true` se algo mudou.
   */
  refresh?(): Promise<boolean>
}
