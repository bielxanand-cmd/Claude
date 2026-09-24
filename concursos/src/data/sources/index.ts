import { createLocalDataSource } from './local'
import type { DataSource } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Carrega o cliente Supabase sob demanda (fora do bundle no modo local). */
function createLazySupabaseDataSource(url: string, anonKey: string): DataSource {
  const loaded = import('./supabase').then((m) => m.createSupabaseDataSource(url, anonKey))
  return new Proxy({ kind: 'supabase' } as DataSource, {
    get(target, prop: keyof DataSource) {
      if (prop === 'kind') return target.kind
      return async (...args: unknown[]) => {
        const source = await loaded
        return (source[prop] as (...a: unknown[]) => unknown)(...args)
      }
    },
  })
}

/**
 * Com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` definidos, os dados vêm do
 * Supabase. Sem eles, o app roda em modo local (seed + localStorage).
 */
export const dataSource: DataSource = url && anonKey ? createLazySupabaseDataSource(url, anonKey) : createLocalDataSource()

export type { DataSource, PositionListItem, PositionFilter } from './types'
