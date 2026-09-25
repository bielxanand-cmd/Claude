import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createLocalRepository } from './local'
import { createSharedRepository } from './shared'
import { createSupabaseRepository } from './supabase'
import type { Repository } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

/** Registra quem criou e quem alterou por último cada proposta. */
function withAuthorship(base: Repository): Repository {
  return {
    ...base,
    async saveProposal(p) {
      const me = await base.whoAmI()
      await base.saveProposal(me ? { ...p, createdBy: p.createdBy ?? me, updatedBy: me } : p)
    },
  }
}

/**
 * Repositório ativo. Começa local e é trocado em `initRepo()` pelo banco
 * compartilhado do link (build com VITE_SHARED=artifact) quando disponível.
 * Export `let`: quem importa sempre vê o valor atual.
 */
export let repo: Repository = withAuthorship(supabase ? createSupabaseRepository(supabase) : createLocalRepository())

let initPromise: Promise<void> | null = null
export function initRepo() {
  initPromise ??= (async () => {
    if (supabase || import.meta.env.VITE_SHARED !== 'artifact') return
    const shared = await createSharedRepository()
    if (shared) repo = withAuthorship(shared)
  })()
  return initPromise
}
export type { Repository }
