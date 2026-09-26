import { createCloudPersistence } from '../persistence/cloud'
import { createLocalDataSource } from './local'
import type { DataSource } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
/** Página publicada no claude.ai: salva na conta do usuário (capacidade `db`). */
const cloudStorage = import.meta.env.VITE_CLOUD_STORAGE === 'true'

/** Carrega o cliente Supabase sob demanda (fora do bundle no modo local). */
function createLazySupabaseDataSource(url: string, anonKey: string): DataSource {
  const loaded = import('./supabase').then((m) => m.createSupabaseDataSource(url, anonKey))
  return new Proxy({ kind: 'supabase' } as DataSource, {
    get(target, prop: keyof DataSource) {
      if (prop === 'kind') return target.kind
      if (prop === 'subscribe') return undefined
      return async (...args: unknown[]) => {
        const source = await loaded
        return (source[prop] as (...a: unknown[]) => unknown)(...args)
      }
    },
  })
}

/**
 * - `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`: dados no Supabase;
 * - `VITE_CLOUD_STORAGE=true` (página publicada): dados na conta do claude.ai;
 * - caso contrário: dados neste navegador (localStorage).
 */
export const dataSource: DataSource =
  url && anonKey ? createLazySupabaseDataSource(url, anonKey) : createLocalDataSource(cloudStorage ? createCloudPersistence : undefined)

export type { DataSource, PositionListItem, PositionFilter } from './types'
