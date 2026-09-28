import { useSyncExternalStore } from 'react'
import { baseRepo, repo } from './repo'
import type { Account } from './repo/types'
import { currentAccount, setCurrentAccount, subscribeAccount, type SessionAccount } from './session'
import { uid } from './templates'
import type { Executive } from './types'

/*
 * Login por e-mail e senha no link compartilhado (e no modo local).
 * As contas ficam em accounts/<id> com a senha protegida por PBKDF2-SHA256
 * com sal próprio. Quem está conectado fica lembrado neste navegador até sair.
 */

const ITERATIONS = 210_000
const SESSION_KEY = 'cibus-propostas:account'
export const MIN_PASSWORD = 8

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256)
  return toB64(bits)
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { passwordSalt: toB64(salt), passwordHash: await derive(password, salt, ITERATIONS), passwordIterations: ITERATIONS }
}

async function verifyPassword(a: Account, password: string) {
  const hash = await derive(password, fromB64(a.passwordSalt), a.passwordIterations)
  // comparação em tempo constante
  let diff = hash.length ^ a.passwordHash.length
  for (let i = 0; i < Math.min(hash.length, a.passwordHash.length); i++) diff |= hash.charCodeAt(i) ^ a.passwordHash.charCodeAt(i)
  return diff === 0
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase()
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(e))

const publicPart = ({ passwordSalt: _s, passwordHash: _h, passwordIterations: _i, ...rest }: Account): SessionAccount => rest

function remember(id: string | null) {
  try {
    if (id) localStorage.setItem(SESSION_KEY, id)
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* navegador sem armazenamento: o login vale só nesta aba */
  }
}

const accounts = async () => {
  if (!baseRepo.listAccounts || !baseRepo.saveAccount) throw new Error('Contas indisponíveis neste modo.')
  return baseRepo.listAccounts()
}
const findByEmail = async (email: string) => (await accounts()).find((a) => a.email === normalizeEmail(email))

async function startSession(a: Account) {
  const next = { ...a, lastLoginAt: new Date().toISOString() }
  await baseRepo.saveAccount!(next)
  remember(a.id)
  setCurrentAccount(publicPart(next))
  claimLegacyProposals(next).catch((e) => console.warn('Propostas antigas não vinculadas', e))
}

/** Reabre a sessão lembrada neste navegador. */
export async function restoreSession() {
  let id: string | null = null
  try {
    id = localStorage.getItem(SESSION_KEY)
  } catch {
    /* sem armazenamento */
  }
  if (!id) return setCurrentAccount(null)
  const a = (await accounts()).find((x) => x.id === id)
  if (!a || !a.active) {
    remember(null)
    return setCurrentAccount(null)
  }
  setCurrentAccount(publicPart(a))
}

export async function signIn(email: string, password: string) {
  const a = await findByEmail(email)
  if (!a || !(await verifyPassword(a, password))) throw new Error('E-mail ou senha incorretos.')
  if (!a.active) throw new Error('Esta conta está desativada. Fale com um administrador.')
  await startSession(a)
}

export interface SignUpInput {
  name: string
  email: string
  password: string
  /** executivo existente, ou null para criar um com o nome da pessoa */
  executiveId: string | null
}

export async function signUp(input: SignUpInput, executives: Executive[], afterExecutiveCreated?: () => Promise<void>) {
  const email = normalizeEmail(input.email)
  const name = input.name.trim()
  if (!name) throw new Error('Informe seu nome.')
  if (!validEmail(email)) throw new Error('Informe um e-mail válido.')
  if (input.password.length < MIN_PASSWORD) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
  const all = await accounts()
  if (all.some((a) => a.email === email)) throw new Error('Já existe uma conta com este e-mail. Use "Entrar".')

  let executiveId = input.executiveId
  const existing = executives.find((e) => e.id === executiveId)
  if (!existing) {
    const exec: Executive = { id: uid(), name, email, phone: '', whatsapp: '', role: 'Executivo de Contas', photo: '', active: true }
    await repo.saveExecutive(exec)
    executiveId = exec.id
    await afterExecutiveCreated?.()
  } else if (!existing.email) {
    await repo.saveExecutive({ ...existing, email })
  }

  const account: Account = {
    id: `acc_${uid()}`,
    email,
    name,
    executiveId,
    // a primeira conta administra as demais
    role: all.some((a) => a.role === 'admin' && a.active) ? 'member' : 'admin',
    active: true,
    ...(await hashPassword(input.password)),
    createdAt: new Date().toISOString(),
  }
  await baseRepo.saveAccount!(account)
  await startSession(account)
}

export function signOut() {
  remember(null)
  setCurrentAccount(null)
}

/** Troca a senha da conta conectada. */
export async function changePassword(current: string | null, next: string) {
  const me = currentAccount()
  if (!me) throw new Error('Entre novamente.')
  if (next.length < MIN_PASSWORD) throw new Error(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`)
  const a = (await accounts()).find((x) => x.id === me.id)
  if (!a) throw new Error('Conta não encontrada.')
  if (current !== null && !(await verifyPassword(a, current))) throw new Error('A senha atual está incorreta.')
  const saved: Account = { ...a, ...(await hashPassword(next)), mustChangePassword: false }
  await baseRepo.saveAccount!(saved)
  setCurrentAccount(publicPart(saved))
}

/** Administrador: define uma senha provisória, trocada no próximo acesso. */
export async function resetPassword(accountId: string) {
  const a = (await accounts()).find((x) => x.id === accountId)
  if (!a) throw new Error('Conta não encontrada.')
  const temp = Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('')
  const password = `cibus-${temp}`
  await baseRepo.saveAccount!({ ...a, ...(await hashPassword(password)), mustChangePassword: true })
  return password
}

/** Administrador: altera nome, executivo, papel ou status de uma conta. */
export async function updateAccount(accountId: string, patch: Partial<Pick<Account, 'name' | 'executiveId' | 'role' | 'active'>>) {
  const me = currentAccount()
  if (me?.role !== 'admin' && (me?.id !== accountId || 'role' in patch || 'active' in patch)) throw new Error('Só administradores podem alterar outras contas.')
  const all = await accounts()
  const a = all.find((x) => x.id === accountId)
  if (!a) throw new Error('Conta não encontrada.')
  const next = { ...a, ...patch }
  const admins = all.filter((x) => (x.id === accountId ? next : x).role === 'admin' && (x.id === accountId ? next : x).active)
  if (!admins.length) throw new Error('Mantenha pelo menos um administrador ativo.')
  await baseRepo.saveAccount!(next)
  if (currentAccount()?.id === accountId) setCurrentAccount(publicPart(next))
}

export const listAccounts = async () => (await accounts()).map(publicPart).sort((a, b) => a.name.localeCompare(b.name))

/**
 * Propostas criadas antes do login por e-mail (identificadas pela conta do
 * claude.ai) passam a pertencer a quem entrou com essa mesma conta.
 */
async function claimLegacyProposals(a: Account) {
  if (repo.mode !== 'shared') return
  const claudeId = (await baseRepo.whoAmI())?.id
  if (!claudeId) return
  const all = await accounts()
  if (all.some((x) => x.id !== a.id && x.claudeUserIds?.includes(claudeId))) return // já é de outra conta
  if (!a.claudeUserIds?.includes(claudeId)) await baseRepo.saveAccount!({ ...a, claudeUserIds: [...(a.claudeUserIds ?? []), claudeId] })
  const me = { id: a.id, name: a.name }
  for (const p of await baseRepo.listProposals()) {
    const mine = p.createdBy?.id === claudeId
    const touched = p.updatedBy?.id === claudeId
    if (mine || touched)
      await baseRepo.saveProposal({ ...p, createdBy: mine ? me : p.createdBy, updatedBy: touched ? me : p.updatedBy })
  }
}

/** Conta conectada (null = ninguém). */
export function useAccount() {
  return useSyncExternalStore(subscribeAccount, currentAccount)
}
