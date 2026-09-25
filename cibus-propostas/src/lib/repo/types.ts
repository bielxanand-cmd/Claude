import type { AppSettings, CaseDef, Executive, ModuleDef, PersonRef, Proposal } from '../types'

export interface PersonProfile {
  name: string
  avatarUrl: string | null
  color: string | null
}

/** Com qual executivo a pessoa do link se identificou. */
export interface Identity {
  executiveId: string | null
  name: string
}

export interface Repository {
  /** local = só neste navegador; shared = banco do link compartilhado; supabase = banco próprio */
  mode: 'local' | 'shared' | 'supabase'
  listProposals(): Promise<Proposal[]>
  getProposal(id: string): Promise<Proposal | null>
  saveProposal(p: Proposal): Promise<void>
  deleteProposal(id: string): Promise<void>

  listModules(): Promise<ModuleDef[]>
  saveModule(m: ModuleDef): Promise<void>
  deleteModule(id: string): Promise<void>

  listCases(): Promise<CaseDef[]>
  saveCase(c: CaseDef): Promise<void>
  deleteCase(id: string): Promise<void>

  listExecutives(): Promise<Executive[]>
  saveExecutive(e: Executive): Promise<void>
  deleteExecutive(id: string): Promise<void>

  getSettings(): Promise<AppSettings | null>
  saveSettings(s: AppSettings): Promise<void>

  /** Retorna uma URL (pública, do próprio link ou data URL) utilizável em <img>. */
  uploadImage(file: File): Promise<string>

  /** Quem está usando o sistema agora (null quando não há identidade). */
  whoAmI(): Promise<PersonRef | null>
  /** Nomes e avatares atuais das pessoas, pelo id. */
  resolvePeople(ids: string[]): Promise<Record<string, PersonProfile>>
  /** Identificação da pessoa (só no banco compartilhado do link). */
  getIdentity?(): Promise<Identity | null>
  setIdentity?(i: Identity): Promise<void>
}
