import { useSyncExternalStore } from 'react'

/** Onde os dados estão sendo salvos e se há gravação pendente — exibido nas Configurações. */
export interface SyncStatus {
  where: 'loading' | 'browser' | 'cloud'
  state: 'idle' | 'saving' | 'error'
  message: string | null
}

let status: SyncStatus = { where: 'loading', state: 'idle', message: null }
const listeners = new Set<() => void>()

export function setSyncStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => status,
  )
}
