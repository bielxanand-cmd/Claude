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
  listUserTopics(): Promise<UserTopic[]>
  updateUserTopic(topicId: string, patch: Partial<Omit<UserTopic, 'topicId'>>): Promise<UserTopic>
  listSummaries(): Promise<Summary[]>
  saveSummary(topicId: string, content: SummaryContent): Promise<Summary>
  deleteSummary(topicId: string): Promise<void>
  resetUserData(): Promise<void>
}
