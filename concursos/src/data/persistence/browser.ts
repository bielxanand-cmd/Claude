import { readJSON, removeKey, writeJSON } from '@/lib/storage'
import { emptyCatalog, type Persistence, type Snapshot, type UserState } from './types'

export const USER_KEY = 'concursos.user.v1'
export const CATALOG_KEY = 'concursos.catalog.v1'

/** Salva no localStorage do navegador (modo padrão do app instalado). */
export function createBrowserPersistence(): Persistence {
  const write = (snapshot: Snapshot) => {
    writeJSON(USER_KEY, snapshot.user)
    writeJSON(CATALOG_KEY, snapshot.catalog)
  }
  return {
    kind: 'browser',
    async load() {
      const user = readJSON<UserState | null>(USER_KEY, null)
      const catalog = readJSON<Partial<Snapshot['catalog']> | null>(CATALOG_KEY, null)
      if (!user && !catalog) return null
      return {
        user: user ? { ...user, history: user.history ?? (user.selection ? [user.selection] : []) } : null,
        catalog: { ...emptyCatalog(), ...catalog },
      }
    },
    save(change, snapshot) {
      if (change.type === 'catalog-meta' || change.type === 'import') writeJSON(CATALOG_KEY, snapshot.catalog)
      else writeJSON(USER_KEY, snapshot.user)
    },
    async saveAll(snapshot) {
      write(snapshot)
    },
    async clear() {
      removeKey(USER_KEY)
      removeKey(CATALOG_KEY)
    },
  }
}
