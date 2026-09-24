import type { AppSettings, CaseDef, Executive, ModuleDef, Proposal } from '../types'

export interface Repository {
  mode: 'local' | 'supabase'
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

  /** Retorna uma URL (pública ou data URL) utilizável em <img>. */
  uploadImage(file: File): Promise<string>
}
