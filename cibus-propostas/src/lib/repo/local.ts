import { createStore, get, set } from 'idb-keyval'
import { DEFAULT_SETTINGS, SEED_CASES, SEED_EXECUTIVES, SEED_MODULES } from '@/data/seed'
import { blobToDataURL, prepareImage } from '../image'
import type { AppSettings, CaseDef, Executive, ModuleDef, Proposal } from '../types'
import type { Repository } from './types'

/** Persistência no navegador (IndexedDB) — usada quando o Supabase não está configurado. */
const store = createStore('cibus-propostas', 'kv')

async function coll<T>(key: string, seed: T[]): Promise<T[]> {
  const v = await get<T[]>(key, store)
  if (v) return v
  await set(key, seed, store)
  return seed
}

async function upsert<T extends { id: string }>(key: string, seed: T[], item: T) {
  const list = await coll(key, seed)
  const i = list.findIndex((x) => x.id === item.id)
  const next = i >= 0 ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]
  await set(key, next, store)
}

async function remove<T extends { id: string }>(key: string, seed: T[], id: string) {
  const list = await coll(key, seed)
  await set(key, list.filter((x) => x.id !== id), store)
}

export function createLocalRepository(): Repository {
  return {
    mode: 'local',
    listProposals: () => coll<Proposal>('proposals', []),
    getProposal: async (id) => (await coll<Proposal>('proposals', [])).find((p) => p.id === id) ?? null,
    saveProposal: (p) => upsert('proposals', [], p),
    deleteProposal: (id) => remove<Proposal>('proposals', [], id),

    listModules: () => coll<ModuleDef>('modules', SEED_MODULES),
    saveModule: (m) => upsert('modules', SEED_MODULES, m),
    deleteModule: (id) => remove('modules', SEED_MODULES, id),

    listCases: () => coll<CaseDef>('cases', SEED_CASES),
    saveCase: (c) => upsert('cases', SEED_CASES, c),
    deleteCase: (id) => remove('cases', SEED_CASES, id),

    listExecutives: async () => {
      // Executivos adicionados ao seed depois do primeiro acesso entram uma única vez
      const list = await coll<Executive>('executives', SEED_EXECUTIVES)
      const seen = (await get<string[]>('executives:seeded', store)) ?? list.map((e) => e.id)
      const missing = SEED_EXECUTIVES.filter((e) => !seen.includes(e.id) && !list.some((x) => x.id === e.id))
      await set('executives:seeded', [...new Set([...seen, ...SEED_EXECUTIVES.map((e) => e.id)])], store)
      if (!missing.length) return list
      const next = [...missing, ...list]
      await set('executives', next, store)
      return next
    },
    saveExecutive: (e) => upsert('executives', SEED_EXECUTIVES, e),
    deleteExecutive: (id) => remove('executives', SEED_EXECUTIVES, id),

    getSettings: async () => (await get<AppSettings>('settings', store)) ?? DEFAULT_SETTINGS,
    saveSettings: (s) => set('settings', s, store),

    uploadImage: async (file) => blobToDataURL(await prepareImage(file)),

    whoAmI: async () => null,
    resolvePeople: async () => ({}),
  }
}
