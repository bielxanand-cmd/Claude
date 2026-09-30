/**
 * Armazenamento dos arquivos anexados.
 *
 * - Página publicada no claude.ai: capacidade `assets` (o arquivo fica com a
 *   página, acessível em qualquer aparelho; a ficha fica na conta do usuário).
 * - Demais casos: IndexedDB deste navegador.
 */
type Assets = {
  upload(blob: Blob, options?: { type?: string }): Promise<{ id: string; url: string }>
  delete(ref: string): Promise<{ deleted: boolean }>
}

export interface FileStore {
  readonly where: 'account' | 'browser'
  put(file: Blob, type: string): Promise<string>
  url(blobId: string): Promise<string>
  remove(blobId: string): Promise<void>
}

export class FileStoreError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

const CLOUD = import.meta.env.VITE_CLOUD_STORAGE === 'true'

function assetsStore(assets: Assets): FileStore {
  return {
    where: 'account',
    async put(file, type) {
      try {
        return (await assets.upload(file, { type })).id
      } catch (e) {
        const code = (e as { code?: string })?.code ?? 'upstream_error'
        if (code === 'store_unavailable') {
          await new Promise((r) => setTimeout(r, 1500))
          return (await assets.upload(file, { type })).id
        }
        throw new FileStoreError(code, (e as { message?: string })?.message ?? code)
      }
    },
    async url(blobId) {
      return `/_blob/${blobId}`
    },
    async remove(blobId) {
      await assets.delete(blobId)
    },
  }
}

/* ------------------------------------------------------------------ IndexedDB */

const DB_NAME = 'concursos-files'
const STORE = 'files'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }).finally(() => db.close())
}

const urls = new Map<string, string>()

function browserStore(): FileStore {
  return {
    where: 'browser',
    async put(file, type) {
      const id = crypto.randomUUID().replace(/-/g, '')
      try {
        await tx('readwrite', (s) => s.put(new Blob([file], { type }), id))
      } catch (e) {
        throw new FileStoreError('quota_or_state', (e as Error)?.message ?? 'Sem espaço no navegador')
      }
      return id
    },
    async url(blobId) {
      const cached = urls.get(blobId)
      if (cached) return cached
      const blob = await tx<Blob | undefined>('readonly', (s) => s.get(blobId) as IDBRequest<Blob | undefined>)
      if (!blob) throw new FileStoreError('not_found', 'Arquivo não encontrado neste navegador')
      const url = URL.createObjectURL(blob)
      urls.set(blobId, url)
      return url
    },
    async remove(blobId) {
      await tx('readwrite', (s) => s.delete(blobId))
      const url = urls.get(blobId)
      if (url) URL.revokeObjectURL(url)
      urls.delete(blobId)
    },
  }
}

let storePromise: Promise<FileStore | null> | null = null

/** O armazenamento disponível nesta página (`null`: sem como guardar arquivos). */
export function getFileStore(): Promise<FileStore | null> {
  return (storePromise ??= (async () => {
    const claude = (globalThis as { claude?: { use(name: 'assets'): Promise<Assets | null> } }).claude
    if (CLOUD && claude?.use) {
      const assets = await claude.use('assets').catch(() => null)
      if (assets) return assetsStore(assets)
    }
    return typeof indexedDB !== 'undefined' ? browserStore() : null
  })())
}

/** Conteúdo do arquivo (para ver um PDF ou baixar). */
export async function readFile(store: FileStore, blobId: string): Promise<Blob> {
  const res = await fetch(await store.url(blobId))
  if (!res.ok) throw new FileStoreError('not_found', 'Arquivo não encontrado')
  return res.blob()
}
