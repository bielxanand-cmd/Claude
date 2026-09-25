import { DEFAULT_SETTINGS, SEED_CASES, SEED_EXECUTIVES, SEED_MODULES } from '@/data/seed'
import { blobToDataURL, prepareImage } from '../image'
import type { AppSettings, CaseDef, Executive, ModuleDef, Proposal } from '../types'
import { createLocalRepository } from './local'
import type { PersonProfile, Repository } from './types'

/*
 * Banco compartilhado do link de teste (capability `db` do visualizador de
 * Artifacts do claude.ai). Todos que abrem o link leem e gravam os mesmos
 * documentos: proposals/<id>, cases/<id>, modules/<id>, executives/<id> e
 * config/settings. As bibliotecas começam com os dados padrão e só são
 * gravadas na primeira alteração.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = Record<string, unknown>
interface DocSnap {
  id: string
  exists: boolean
  data(): Json | undefined
}
interface DocRef {
  get(): Promise<DocSnap>
  set(data: Json): Promise<void>
  delete(): Promise<void>
}
interface CollRef {
  doc(id: string): DocRef
  get(): Promise<{ docs: DocSnap[] }>
}
interface Db {
  doc(path: string): DocRef
  collection(path: string): CollRef
}
interface UserNs {
  id(): Promise<string | null>
  profiles(ids: string[]): Promise<Record<string, { name: string; avatarUrl: string; color: string }>>
}
interface AssetsNs {
  upload(blob: Blob, options?: { type?: string }): Promise<{ id: string; url: string }>
}
type ClaudeHost = { use?: (name: string) => Promise<unknown> }

export const claudeHost = () => (window as unknown as { claude?: ClaudeHost }).claude

const MAX_DOC_BYTES = 240_000

const clean = <T,>(v: T): Json => JSON.parse(JSON.stringify(v)) as Json

async function shrinkDataUrl(url: string, maxSize: number): Promise<string> {
  if (!url.startsWith('data:image/') || url.startsWith('data:image/svg')) return url
  const img = new Image()
  img.src = url
  await img.decode()
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const png = url.startsWith('data:image/png')
  return canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.8)
}

/** Reduz imagens embutidas até o documento caber no limite do banco. */
async function fitDocument(body: Json): Promise<Json> {
  let text = JSON.stringify(body)
  for (const maxSize of [1200, 800, 500, 320]) {
    if (text.length <= MAX_DOC_BYTES) break
    const urls = [...new Set(text.match(/data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+/g) ?? [])]
    for (const u of urls) text = text.split(u).join(await shrinkDataUrl(u, maxSize))
  }
  if (text.length > MAX_DOC_BYTES) throw new Error('As imagens desta proposta são grandes demais. Envie imagens menores e tente de novo.')
  return JSON.parse(text) as Json
}

export async function createSharedRepository(): Promise<Repository | null> {
  const host = claudeHost()
  if (!host?.use) return null
  const db = (await host.use('db').catch(() => null)) as Db | null
  if (!db) return null
  const user = (await host.use('user').catch(() => null)) as UserNs | null
  const assets = (await host.use('assets').catch(() => null)) as AssetsNs | null

  const all = async <T,>(coll: string) => (await db.collection(coll).get()).docs.filter((d) => d.exists).map((d) => d.data() as T)

  /** Bibliotecas: sem nada gravado, valem os dados padrão. */
  const library = async <T extends { id: string }>(coll: string, seed: T[]) => {
    const list = await all<T>(coll)
    return list.length ? list : seed
  }
  /** Antes da primeira gravação, copia os dados padrão para o banco. */
  const ensureSeeded = async <T extends { id: string }>(coll: string, seed: T[]) => {
    const list = await all<T>(coll)
    if (list.length) return
    for (const item of seed) await db.collection(coll).doc(item.id).set(clean(item))
  }
  const saveIn = <T extends { id: string }>(coll: string, seed: T[]) => async (item: T) => {
    await ensureSeeded(coll, seed)
    await db.collection(coll).doc(item.id).set(await fitDocument(clean(item)))
  }
  const deleteIn = <T extends { id: string }>(coll: string, seed: T[]) => async (id: string) => {
    await ensureSeeded(coll, seed)
    await db.collection(coll).doc(id).delete()
  }

  let myId: Promise<string | null> | null = null

  return {
    mode: 'shared',
    listProposals: () => all<Proposal>('proposals'),
    getProposal: async (id) => {
      const snap = await db.collection('proposals').doc(id).get()
      return snap.exists ? (snap.data() as unknown as Proposal) : null
    },
    saveProposal: async (p) => db.collection('proposals').doc(p.id).set(await fitDocument(clean(p))),
    deleteProposal: (id) => db.collection('proposals').doc(id).delete(),

    listModules: () => library<ModuleDef>('modules', SEED_MODULES),
    saveModule: saveIn<ModuleDef>('modules', SEED_MODULES),
    deleteModule: deleteIn<ModuleDef>('modules', SEED_MODULES),

    listCases: () => library<CaseDef>('cases', SEED_CASES),
    saveCase: saveIn<CaseDef>('cases', SEED_CASES),
    deleteCase: deleteIn<CaseDef>('cases', SEED_CASES),

    listExecutives: () => library<Executive>('executives', SEED_EXECUTIVES),
    saveExecutive: saveIn<Executive>('executives', SEED_EXECUTIVES),
    deleteExecutive: deleteIn<Executive>('executives', SEED_EXECUTIVES),

    getSettings: async () => {
      const snap = await db.doc('config/settings').get()
      return snap.exists ? (snap.data() as unknown as AppSettings) : DEFAULT_SETTINGS
    },
    saveSettings: async (s) => db.doc('config/settings').set(await fitDocument(clean(s))),

    uploadImage: async (file) => {
      const blob = await prepareImage(file, 1600)
      if (assets) {
        try {
          const up = await assets.upload(blob, { type: blob.type })
          return `/_blob/${up.id}`
        } catch {
          /* sem permissão de envio: guarda a imagem na própria proposta */
        }
      }
      return blobToDataURL(await prepareImage(file, 1000))
    },

    whoAmI: async () => {
      myId ??= user ? user.id() : Promise.resolve(null)
      const id = await myId
      return id ? { id, name: '' } : null
    },
    resolvePeople: async (ids) => {
      if (!user || !ids.length) return {}
      const ps = await user.profiles(ids)
      const out: Record<string, PersonProfile> = {}
      for (const [id, p] of Object.entries(ps)) out[id] = { name: p.name, avatarUrl: p.avatarUrl, color: p.color }
      return out
    },
  }
}

/** Propostas e bibliotecas salvas neste navegador antes do banco compartilhado. */
export async function localDataSummary(shared: Repository) {
  const local = createLocalRepository()
  const [mine, remote] = await Promise.all([local.listProposals(), shared.listProposals()])
  const remoteIds = new Set(remote.map((p) => p.id))
  return mine.filter((p) => !remoteIds.has(p.id))
}

/** Copia para o banco compartilhado o que existe só neste navegador. */
export async function importLocalData(shared: Repository) {
  const local = createLocalRepository()
  const me = await shared.whoAmI()
  const pending = await localDataSummary(shared)
  for (const p of pending) await shared.saveProposal({ ...p, createdBy: p.createdBy ?? me ?? undefined, updatedBy: me ?? p.updatedBy })

  // bibliotecas: acrescenta o que ainda não existe no banco compartilhado
  const merge = async <T extends { id: string }>(mine: T[], theirs: T[], save: (x: T) => Promise<void>) => {
    const have = new Set(theirs.map((x) => x.id))
    for (const x of mine) if (!have.has(x.id)) await save(x)
  }
  await merge(await local.listCases(), await shared.listCases(), shared.saveCase)
  await merge(await local.listExecutives(), await shared.listExecutives(), shared.saveExecutive)
  await merge(await local.listModules(), await shared.listModules(), shared.saveModule)
  // casos padrão editados localmente (ex.: logos adicionados) substituem os padrão
  const sharedCases = await shared.listCases()
  for (const c of await local.listCases()) {
    const remote = sharedCases.find((x) => x.id === c.id)
    if (remote && JSON.stringify(remote) !== JSON.stringify(c) && SEED_CASES.some((s) => s.id === c.id && JSON.stringify(s) === JSON.stringify(remote)))
      await shared.saveCase(c)
  }
  // configurações: leva as deste navegador se o banco ainda estiver no padrão
  const [localSettings, sharedSettings] = await Promise.all([local.getSettings(), shared.getSettings()])
  if (localSettings && JSON.stringify(sharedSettings) === JSON.stringify(DEFAULT_SETTINGS) && JSON.stringify(localSettings) !== JSON.stringify(DEFAULT_SETTINGS))
    await shared.saveSettings(localSettings)
  return pending.length
}
