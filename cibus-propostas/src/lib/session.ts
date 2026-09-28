import type { Account } from './repo/types'

/*
 * Conta conectada neste navegador. Fica separado de `auth.ts` para que o
 * repositório possa carimbar o autor das propostas sem dependência circular.
 */
export type SessionAccount = Omit<Account, 'passwordSalt' | 'passwordHash' | 'passwordIterations'>

let current: SessionAccount | null = null
const listeners = new Set<() => void>()

export const currentAccount = () => current
export function setCurrentAccount(a: SessionAccount | null) {
  current = a
  listeners.forEach((l) => l())
}
export function subscribeAccount(l: () => void) {
  listeners.add(l)
  return () => void listeners.delete(l)
}
