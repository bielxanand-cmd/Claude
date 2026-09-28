import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { currentAccount } from '../session'
import { createLocalRepository } from './local'
import { createSharedRepository } from './shared'
import { createSupabaseRepository } from './supabase'
import type { Repository } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

/** Link de teste no claude.ai: os dados ficam no banco do próprio link. */
export const SHARED_BUILD = !supabase && import.meta.env.VITE_SHARED === 'artifact'

/**
 * Autoria: com login por e-mail, a conta conectada é quem cria e altera as
 * propostas; sem ele, a identidade do repositório (Supabase ou claude.ai).
 */
function withAuthorship(base: Repository): Repository {
  const me = async () => {
    const acc = currentAccount()
    return acc ? { id: acc.id, name: acc.name } : base.whoAmI()
  }
  return {
    ...base,
    whoAmI: me,
    async saveProposal(p) {
      const who = await me()
      if (!who) return base.saveProposal(p)
      const createdBy = !p.createdBy || (p.createdBy.id === who.id && !p.createdBy.name) ? who : p.createdBy
      await base.saveProposal({ ...p, createdBy, updatedBy: who })
    },
    async resolvePeople(ids) {
      const accIds = ids.filter((id) => id.startsWith('acc_'))
      const [people, accounts] = await Promise.all([
        base.resolvePeople(ids.filter((id) => !id.startsWith('acc_'))),
        accIds.length && base.listAccounts ? base.listAccounts() : Promise.resolve([]),
      ])
      for (const a of accounts) if (accIds.includes(a.id)) people[a.id] = { name: a.name, avatarUrl: null, color: null }
      return people
    },
  }
}

/** Repositório sem o carimbo de autoria (para migrações que preservam os autores). */
export let baseRepo: Repository = supabase ? createSupabaseRepository(supabase) : createLocalRepository()

/**
 * Repositório ativo. Começa local e é trocado em `initRepo()` pelo banco
 * compartilhado do link (build com VITE_SHARED=artifact).
 * Export `let`: quem importa sempre vê o valor atual.
 */
export let repo: Repository = withAuthorship(baseRepo)

let initPromise: Promise<void> | null = null
export function initRepo() {
  initPromise ??= (async () => {
    if (!SHARED_BUILD) return
    const shared = await createSharedRepository()
    // Nunca cair no modo local sem avisar: o que fosse salvo ficaria só neste navegador.
    if (!shared) {
      initPromise = null
      throw new Error('Não foi possível conectar ao banco da equipe.')
    }
    baseRepo = shared
    repo = withAuthorship(shared)
  })()
  return initPromise
}
export type { Repository }
